import Vue, {ComponentOptions} from 'vue'
import {RouteConfig, RouterOptions} from 'vue-router';
import {OpenAPIV3} from 'openapi-types';
import {dereference, validate} from 'swagger-parser'
import ParameterObject = OpenAPIV3.ParameterObject;
export import Document = OpenAPIV3.Document;

const parseRoute = (components: { [operationId: string]: ComponentOptions<Vue> }, pathKey: string, operation: any): RouteConfig => {
    let params: { path: ParameterObject[], query: ParameterObject[] } = {path: [], query: []};
    if (!operation.operationId) {
        throw new Error('Operation object must contain operationId');
    }

    if (operation.parameters && Array.isArray(operation.parameters)) {
        for (const parameter of operation.parameters) {
            if (parameter.in === 'path') {
                params.path.push(parameter)
            }
            if (parameter.in === 'query') {
                params.query.push(parameter)
            }
        }
    }

    return {
        path: pathKey,
        name: operation.operationId,
        ...components[operation.operationId] && {component: components[operation.operationId]},
        props: (route) => {
            const result: Object = {};
            if (params.path.length) {
                for (const param of params.path) {
                    Object.assign(result, {[param.name]: route.params[param.name]});
                }
            }
            if (params.query.length) {
                for (const param of params.path) {
                    Object.assign(result, {[param.name]: route.query[param.name]});
                }
            }
            return result;
        }
    }
};

export const VueOasRoutes = (api: OpenAPIV3.Document, componentsObj: { [operationId: string]: ComponentOptions<Vue> } | Array<ComponentOptions<Vue>>, options: RouterOptions = {}): RouterOptions => {
    // Normalize components for easy access if in array form
    let components: { [operationId: string]: ComponentOptions<Vue> } = {};
    if (!Array.isArray(componentsObj)) {
        components = componentsObj;
    } else {
        const result: { [operationId: string]: ComponentOptions<Vue> } = {};
        for (const component of componentsObj) {
            if (component.name) {
                Object.assign(result, {[component.name]: component})
            }
        }
    }

    // Create routes with operationId as set key
    const routes: { [key: string]: RouteConfig } = {};

    // Parse paths in swagger and assign provided components accordingly
    const pathEntries = Object.entries(api.paths);
    pathEntries.forEach(([pathKey, pathObj]) => {
        if (pathObj.get && pathObj.get.operationId) {
            routes[pathObj.get.operationId] = parseRoute(components, pathKey, pathObj.get);
        }
    });

    // Merge generated routes with provided route options
    if (options && Array.isArray(options.routes)) {
        const generatedRouteOpIds = Object.keys(routes);
        options.routes.forEach((route) => {
            if (route.name) {
                if (generatedRouteOpIds.includes(route.name)) {
                    routes[route.name] = Object.assign(routes[route.name], route)
                } else {
                    routes[route.name] = route
                }
            }
        });
    }

    // Overwrite provided routes with combined routes
    options.routes = Object.values(routes);

    // Merge generated routes with provided route options
    return options;
};
