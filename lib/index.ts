import {OpenAPIV3} from 'openapi-types';
import {dereference, validate} from 'swagger-parser';
import Vue, {ComponentOptions} from 'vue';
import {Route, RouteConfig} from 'vue-router';
import {RoutePropsFunction} from 'vue-router/types/router';
import ParameterObject = OpenAPIV3.ParameterObject;
export import Document = OpenAPIV3.Document;

export const propsGuard = (params: Params) => {
    return (route: Route) => {
        let result: { [key: string]: string } = {};
        if (params.path.length) {
            for (const param of params.path) {
                result = Object.assign(result, {[param.name]: route.params[param.name]});
            }
        }
        if (params.query.length) {
            for (const query of params.query) {
                result = Object.assign(result, {[query.name]: route.query[query.name]});
            }
        }
        return result;
    };
};

export const translateToRoute = (vueComponents: { [operationId: string]: ComponentOptions<Vue> }, oasPath: string, oasOperation: any): EssentialRouteConfig => {
    const params: Params = {path: [], query: []};

    if (!oasOperation.operationId) {
        throw new Error(`Path: ${oasPath} -> GET :: Must contain operationId`);
    }

    if (!vueComponents[oasOperation.operationId]) {
        throw new Error(`Path: ${oasPath} -> GET -> ${oasOperation.operationId} :: Missing Vue Component implementation`);
    }

    // Parse OAS parameters
    if (oasOperation.parameters && Array.isArray(oasOperation.parameters)) {
        for (const parameter of oasOperation.parameters) {
            if (parameter.in === 'query') {
                params.query.push(parameter);
            }
            if (parameter.in === 'path') {
                params.path.push(parameter);
            }
            // Ignore parameters that are not in query or path
        }
    }

    return {
        path: oasPath.replace(/{/, ':').replace(/}/, ''),
        name: oasOperation.operationId,
        component: vueComponents[oasOperation.operationId],
        props: propsGuard(params)
    };
};

export const VueOasRoutes = (api: OpenAPIV3.Document, componentsObj: { [operationId: string]: ComponentOptions<Vue> } | EssentialVueComponentOptions[], routeConfigs: RouteConfig[] = []): RouteConfig[] => {
    // Normalize components for easy access if in array form
    let components: { [operationId: string]: ComponentOptions<Vue> } = {};

    if (!Array.isArray(componentsObj)) {
        components = componentsObj;
    } else {
        for (const component of componentsObj) {
            Object.assign(components, {[component.name]: component});
        }
    }

    // Generate routes with operationId as set key
    const routes: RouteConfig[] = [];
    const pathEntries = Object.entries(api.paths); // Get API paths
    pathEntries.forEach(([pathKey, pathObj]) => {
        if (pathObj.get) { // Vue router enforces only GET requests
            routes.push(translateToRoute(components, pathKey, pathObj.get)); // Parse API and create route
        }
    });

    // Merge generated routes with provided route options
    for (const route of routeConfigs) {
        if (!route.caseSensitive) {
            route.path = route.path.toLowerCase();
        }

        const byPath = routes.findIndex(current => { // Search for path match
            if (!route.caseSensitive) {
                return typeof current.path === 'string' && current.path.toLowerCase() === route.path;
            }
            return typeof current.path === 'string' && current.path === route.path;
        });
        if (byPath !== -1) {
            routes[byPath] = Object.assign(routes[byPath], route); // Merge
            continue;
        }

        const byName = routes.findIndex(current => { // Search for name match
            return typeof current.name === 'string' && current.name === route.name;
        });
        if (byName !== -1) {
            routes[byName] = Object.assign(routes[byName], route); // Merge
            continue;
        }

        routes.push(route); // No matching route
    }
    return routes;
};

export interface Params {
    path: ParameterObject[];
    query: ParameterObject[];
}

export interface EssentialRouteConfig extends RouteConfig {
    name: string;
    component: ComponentOptions<Vue>;
    props: RoutePropsFunction;
}

export interface EssentialVueComponentOptions extends ComponentOptions<Vue> {
    name: string;
}
