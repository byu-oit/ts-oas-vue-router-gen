import {api, endpoint, request, response, body} from '@airtasker/spot'

@api({
    name: "My API"
})
export default class Api {}

@endpoint({
    method: "POST",
    path: "/users"
})
class CreateUser {
    @request
    request(@body body: CreateUserRequest) {}

    @response({ status: 201 })
    response(@body body: CreateUserResponse) {}
}

interface CreateUserRequest {
    firstName: string;
    lastName: string;
}

interface CreateUserResponse {
    firstName: string;
    lastName: string;
    role: string;
}
