import {assert} from 'chai';
import {VueOasRoutes, Document} from '../lib'
import * as api from './oas.json';
import Vue, {ComponentOptions} from 'vue'
import { Route } from 'vue-router';

describe('OAS Vue Router Generator', () => {
    describe('parseRoutes', () => {

    });

    describe('VueOasRoutes', () => {
        let doc = JSON.parse(JSON.stringify(api));
        beforeEach(() => {
            // reset doc
            doc = JSON.parse(JSON.stringify(api))
        });


        it('will ignore an OAS path object that does not contain a get method', () => {
            delete doc.paths['/users'].get;
            const result = VueOasRoutes(doc as Document, {'fake': {name: 'fake'}});
            const actual = Array.isArray(result.routes) ? result.routes.length : -1;
            const expected = 0;
            assert.deepEqual(actual, expected);
        });

        it('will ignore an OAS path object that does not contain an operationId in the get method', () => {
            delete doc.paths['/users'].get.operationId;
            const result = VueOasRoutes(doc as Document, [{name: 'fake'}]);
            const actual = Array.isArray(result.routes) ? result.routes.length : -1;
            const expected = 0;
            assert.equal(actual, expected);
        });

        it('will ignore an OAS parameter that is not in the path or query', () => {
            doc.paths['/users'].get.parameters[0].in = 'header';
            const propsRoute = {
                path: '',
                fullPath: '',
                query: {fake: 'totally'},
                params: {},
                hash: '',
                matched: []
            };
            const result = VueOasRoutes(doc as Document, [{name: 'fake'}]);
            const actual = Array.isArray(result.routes)
                && result.routes.length === 1
                && typeof result.routes[0].props === 'function'
                ? result.routes[0].props(propsRoute)
                : null;
            const expected = {};
            assert.deepEqual(actual, expected);
        });
    })
});
