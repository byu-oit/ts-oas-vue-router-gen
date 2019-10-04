import {assert} from 'chai';
import {EssentialVueComponentOptions, propsGuard, translateToRoute, VueOasRoutes} from '../lib'
import * as api from './oas.json';
import {Route, RouteConfig} from 'vue-router';
import {OpenAPIV3} from "openapi-types";
import ParameterObject = OpenAPIV3.ParameterObject;

describe('OAS Vue Router Generator', () => {
    let doc = JSON.parse(JSON.stringify(api));
    let flag = true;

    let stubUsersComp: EssentialVueComponentOptions;
    let stubUserProfileComp: EssentialVueComponentOptions;
    let stubComponents: { [key: string]: EssentialVueComponentOptions };
    let stubComponentsArr: [EssentialVueComponentOptions, EssentialVueComponentOptions];

    let stubQueryOptions: { [key: string]: string };
    let stubParamOptions: { [key: string]: string };
    let stubFakeRouteOptions: { [key: string]: string };
    let stubRouteOptions: Route;

    let stubQueryParameters: ParameterObject[];
    let stubPathParameters: ParameterObject[];
    let stubParameters: { query: ParameterObject[], path: ParameterObject[] };

    let customUsersRouteConfig: RouteConfig;
    let customUserProfileRouteConfig: RouteConfig;
    let customRedirectRouteConfig: RouteConfig;
    let customRouteConfigs: [RouteConfig, RouteConfig, RouteConfig];

    beforeEach(() => {
        // reset doc
        doc = JSON.parse(JSON.stringify(api));
        flag = true;

        stubUsersComp = {name: 'Users'};
        stubUserProfileComp = {name: 'UserProfile'};
        stubComponents = {Users: stubUsersComp, UserProfile: stubUserProfileComp};
        stubComponentsArr = [stubUsersComp, stubUserProfileComp];

        stubQueryOptions = {effectiveId: '1234'};
        stubParamOptions = {id: '4321'};
        stubFakeRouteOptions = {fake: 'totally'};
        stubRouteOptions = {
            path: '',
            fullPath: '',
            query: {},
            params: {},
            hash: '',
            matched: []
        };

        stubQueryParameters = [{name: 'effectiveId', in: 'query'}];
        stubPathParameters = [{name: 'id', in: 'path'}];
        stubParameters = {query: [], path: []};

        customUsersRouteConfig = {
            path: '/Users',
            name: 'Users',
            caseSensitive: true
        };
        customUserProfileRouteConfig = {
            path: '/Users/:id',
            caseSensitive: false
        };
        customRedirectRouteConfig = {
            path: '*',
            redirect: {name: 'Users'}
        };
        customRouteConfigs = [customUsersRouteConfig, customUserProfileRouteConfig, customRedirectRouteConfig];
    });

    describe('propsGuard', () => {
        it('will return only OAS parameters', () => {
            stubRouteOptions.query = Object.assign(stubFakeRouteOptions, stubQueryOptions);
            stubParameters = {query: stubQueryParameters, path: []};
            let result = propsGuard(stubParameters)(stubRouteOptions);
            assert.deepEqual(result, stubQueryOptions);

            stubRouteOptions.params = Object.assign(stubFakeRouteOptions, stubParamOptions);
            stubParameters = {query: [], path: stubPathParameters};
            result = propsGuard(stubParameters)(stubRouteOptions);
            assert.deepEqual(result, stubParamOptions);
        });
    });

    describe('translateToRoute', () => {
        it('will throw an error if OperationObject is missing an operationId', () => {
            delete doc.paths['/users'].get.operationId;
            try {
                translateToRoute(stubComponents, '/fake/path', doc.paths['/users'].get);
                assert.isFalse(flag)
            } catch (e) {
                assert.isTrue(flag);
            }
        });

        it('will throw an error if a required component is not provided', () => {
            delete stubComponents['Users'];
            try {
                translateToRoute(stubComponents, '/fake/path', doc.paths['/users'].get);
                assert.isFalse(flag)
            } catch (e) {
                assert.isTrue(flag);
            }
        });

        it('will ignore an OperationObject that doesn\'t have parameters', () => {

        });
    });

    describe('VueOasRoutes', () => {
        it('will exclude an OAS path object that does not contain a get method', () => {
            delete doc.paths['/users'].get;
            const routes = VueOasRoutes(doc, stubComponents);
            const actual = Array.isArray(routes) ? routes.length : -1;
            const expected = 1;
            assert.deepEqual(actual, expected);
        });

        it('will fail when an OAS path object does not contain an operationId in the get method', () => {
            delete doc.paths['/users'].get.operationId;
            try {
                VueOasRoutes(doc, stubComponentsArr);
                assert.isFalse(flag);
            } catch (e) {
                assert.isTrue(flag);
            }
        });

        it('will ignore an OAS parameter that is missing or malformed', () => {
            // Missing parameters
            delete doc.paths['/users'].get.parameters;

            // Mal-formed parameters
            doc.paths['/users/{id}'].get.parameters = {};

            const routes = VueOasRoutes(doc, stubComponentsArr);
            for (const route of routes) {
                if (typeof route.props === 'function') {
                    const actual = route.props(stubRouteOptions);
                    const expected = {};
                    assert.deepEqual(actual, expected);
                }
            }
        });

        it('will ignore OAS parameters that are not in the path or query', () => {
            // Parameter is not in "path" or "query"
            doc.paths['/users'].get.parameters[0].in = 'header';
            doc.paths['/users/{id}'].get.parameters[0].in = 'body';

            const routes = VueOasRoutes(doc, stubComponentsArr);
            for (const route of routes) {
                if (typeof route.props === 'function') {
                    const actual = route.props(stubRouteOptions);
                    const expected = {};
                    assert.deepEqual(actual, expected);
                }
            }
        });

        it('will correctly merge generated routes with provided routes', () => {
            const routes = VueOasRoutes(doc, stubComponentsArr, customRouteConfigs);
            assert.equal(routes.length, 3);

            const usersRoute = routes.find(route => route.name === 'Users');
            const userProfileRoute = routes.find(route => route.name === 'UserProfile');
            const redirectRoute = routes.find(route => route.path === '*');

            if (!usersRoute) {
                assert.isFalse(flag);
            } else {
                assert.equal(usersRoute.name, customUsersRouteConfig.name);
                assert.equal(usersRoute.path, customUsersRouteConfig.path);
                assert.equal(usersRoute.caseSensitive, customUsersRouteConfig.caseSensitive);
            }

            if (!userProfileRoute) {
                assert.isFalse(flag);
            } else {
                assert.equal(userProfileRoute.path, customUserProfileRouteConfig.path);
                assert.equal(userProfileRoute.caseSensitive, customUserProfileRouteConfig.caseSensitive);
            }

            if (!redirectRoute) {
                assert.isFalse(flag);
            } else {
                assert.equal(redirectRoute.path, customRedirectRouteConfig.path);
                assert.deepEqual(redirectRoute.redirect, customRedirectRouteConfig.redirect);
            }
        })
    })
});
