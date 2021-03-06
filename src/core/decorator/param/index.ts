import { IInjectOptions, ClassInstance, ClassConstructor } from './../../types';
import { 
    addDepNamesToConstructorMetadata, 
    addDepTypesToMethodMetadata,
    addDepNamesToMethodMetadata,
    addDepTypesToConstructorMetadata,
    getMethodParamTypes,
} from '../method'
import Errors from '../../../error'
import {
    addPayloadToMetadata
} from '../tools'

export const classPrototypeMetadata = Symbol('class-prototype-metadata')

export interface IInjectedPropertyPayload {
    [property: string]: IInjectOptions
}

const Inject = function(_args ?: string | IInjectOptions) {
    let args: IInjectOptions
    if(typeof _args === 'string' || _args == undefined) args = {name: _args} as any as IInjectOptions
    else args = _args
    
    return (target:ClassInstance | ClassConstructor, propertyKey:string, index ?: number) => {
        let name = args.name
        // propertyDecorator
        if(index == undefined) {
            if(!name) {
                const type:Function = Reflect.getMetadata("design:type", target, propertyKey)
                args.name = type.prototype.constructor.name
            }
            const injectedPropertyPayload:IInjectedPropertyPayload = {[propertyKey]: args}
            addInjectedPropertyToClassPrototype(target, injectedPropertyPayload)
        } else {
            // priority than @Service, be case to cover by @Service decorator
            if(!name) {
                const paramsTypes:Function[] = getMethodParamTypes(target, propertyKey)
                const type = paramsTypes[index]
                name = type.prototype.constructor.name
                const badCase = ['Object', 'Array', 'String', 'Number', 'Symbol', 'Function', 'BigInt']
                if(badCase.indexOf(name) != -1) Errors(6)
                args.name = name
            }
            // constructor
            if(!propertyKey) {
                if(target instanceof Function) {
                    addDepNamesToConstructorMetadata(target, name)
                    // TODO: types是否需要保留
                    addDepTypesToConstructorMetadata(target)
                }
            }
            else {
                args.type = 'provide'
                addDepNamesToMethodMetadata(target, propertyKey, String(index), args)
                addDepTypesToMethodMetadata(target, propertyKey, String(index))
            }
        }  
    }
}

const Params = (key: string):ParameterDecorator => {
    return (target:Object, propertyKey: string, index: number) => {
        const payload = {type: 'param', name: key}
        addDepNamesToMethodMetadata(target, propertyKey, String(index), payload as any)
    }
}

const Body = (key ?: string, options: Object = {}):ParameterDecorator => {
    return (target:Object, propertyKey: string, index: number) => {
        const payload:IInjectOptions = {type: 'body', name: key, ...options}
        addDepNamesToMethodMetadata(target, propertyKey, String(index), payload)
    }
} 

const addInjectedPropertyToClassPrototype = (target:ClassInstance, injectedPropertyPayload: IInjectedPropertyPayload) => {
    addPayloadToMetadata(target, null, 'injectedProperty', injectedPropertyPayload, classPrototypeMetadata, null, 'object')
}

const Transform = (key: string, method: string): ParameterDecorator => {
    return Body(key, {transform: method})
}

export {
    Inject,
    Params,
    Body,
    Transform,
}


