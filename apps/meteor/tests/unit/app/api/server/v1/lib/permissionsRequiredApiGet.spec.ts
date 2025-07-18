import type { HttpStatusCode } from '@rocket.chat/apps-engine/definition/accessors';
import { MeteorError } from '@rocket.chat/core-services';
import { expect } from 'chai';
import { before, describe, it } from 'mocha';
import mock from 'proxyquire';
import Sinon from 'sinon';

const userPermissions: { [k: string]: string[] } = {
	user1: ['manage-outgoing-integrations'],
	user2: ['manage-own-outgoing-integrations'],
	user3: [],
};

const stubs = {
	'../../../../../../../app/api/server/api': {
		API: {
			v1: {
				success: (result: unknown) => ({
					statusCode: 200,
					body: result,
				}),
				failure: (result: unknown) => ({
					statusCode: 400,
					body: result,
				}),
				defaultFieldsToExclude: {},
				limitedUsers: new Map(),
				get: {},
				addRoute: {},
				endpoints: [] as any[],
			},
		},
		Permissions: {},
	},
	'../../../../../../../app/authorization/server': {
		hasAllPermissionAsync: async (userId: string, permissions: string[]): Promise<boolean> => {
			if (!userPermissions[userId]) {
				return false;
			}
			return permissions.every((permission) => userPermissions[userId].includes(permission));
		},
		hasAtLeastOnePermissionAsync: async (userId: string, permissions: string[]): Promise<boolean> => {
			if (!userPermissions[userId]) {
				return false;
			}
			return permissions.some((permission) => userPermissions[userId].includes(permission));
		},
	},
	'meteor/meteor': {
		Meteor: {
			Error: MeteorError,
			userId: Sinon.stub().returns('userId'),
		},
	},
	'meteor/webapp': {
		WebApp: {
			rawConnectHandlers: [],
		},
	},
	'meteor/accounts-base': {
		Accounts: {
			_hashLoginToken: (token: string) => token,
		},
	},
};

const { API } = mock.noCallThru().load<{ API: any }>('../../../../../../../app/api/server/api', stubs);

function fakeRequest(userId: string) {
	return {
		userId,
		user: { _id: userId },
		request: {
			headers: new Map([['x-user-id', userId]]),
		},
		queryParams: {},
		response: {},
		requestIp: '127.0.0.1',
	};
}

describe('API', () => {
	before(() => {
		API.v1.get(
			'test.permissionsRequired',
			{
				authRequired: true,
				permissionsRequired: {
					GET: {
						permissions: ['manage-outgoing-integrations', 'manage-own-outgoing-integrations'],
						operation: 'hasAny',
					},
				},
				response: {
					200: () => true,
				},
			},
			async function action() {
				return API.v1.success({ ok: true });
			},
		);
	});

	it('should return 200 if user has at least one required permission', async () => {
		const ctx = fakeRequest('user1');
		const res = await API.v1.endpoints['test.permissionsRequired'].get.call(ctx);
		expect(res.statusCode).to.equal(200);
		expect((res.body as any).ok).to.equal(true);
	});

	it('should return 200 if user has the other required permission', async () => {
		const ctx = fakeRequest('user2');
		const res = await API.v1.endpoints['test.permissionsRequired'].get.call(ctx);
		expect(res.statusCode).to.equal(200);
		expect((res.body as any).ok).to.equal(true);
	});

	it('should return 403 if user has none of the required permissions', async () => {
		const ctx = fakeRequest('user3');
		const res = (await API.v1.endpoints['test.permissionsRequired'].get.call(ctx)) as { statusCode: HttpStatusCode; body: any };
		expect(res.statusCode).to.equal(403);
		expect(res.body.success).to.equal(false);
	});
});
