import { expect } from 'chai';
import { describe, it, before } from 'mocha';
import proxyquire from 'proxyquire';
import sinon from 'sinon';

// Mock permission checking
const userPermissions: { [k: string]: string[] } = {
	user1: ['manage-outgoing-integrations'],
	user2: ['manage-own-outgoing-integrations'],
	user3: [],
};

const insertUserDoc = sinon.stub();

const { API } = proxyquire.noCallThru().load('../../../../../../../app/api/server/api', {
	'../../authorization/server/functions/hasPermission': {
		hasAllPermissionAsync: (userId: string, permissions: string[]): boolean => {
			return permissions.every((permission) => userPermissions[userId].includes(permission));
		},
		hasAtLeastOnePermissionAsync: (userId: string, permissions: string[]): boolean => {
			return permissions.some((permission) => userPermissions[userId].includes(permission));
		},
	},
	'meteor/webapp': {},
	'meteor/accounts-base': {
		Accounts: {
			insertUserDoc,
			_bcryptRounds: () => 10,
		},
	},
	'meteor/meteor': { Meteor: {} },
	'meteor/check': {},
	'meteor/random': {},
	'meteor/underscore': {},
	'meteor/rocketchat:logger': {},
	'meteor/rocketchat:authorization': {},
});

// Register a test endpoint
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

describe('API.v1.GET permissionsRequired runtime', () => {
	beforeEach(() => {
		insertUserDoc.reset();
	});

	function fakeRequest(userId: string) {
		// Simulate the minimal request context for the endpoint
		return {
			userId,
			user: { _id: userId },
			request: { headers: new Map([['x-user-id', userId]]) },
			queryParams: {},
			response: {},
			requestIp: '127.0.0.1',
		};
	}

	it('should return 200 if user has at least one required permission', async () => {
		const ctx = fakeRequest('user1');
		const res = await API.v1.endpoints['test.permissionsRequired'].get.call(ctx);
		expect(res.statusCode).to.equal(200);
		expect(res.body.ok).to.equal(true);
	});

	it('should return 200 if user has the other required permission', async () => {
		const ctx = fakeRequest('user2');
		const res = await API.v1.endpoints['test.permissionsRequired'].get.call(ctx);
		expect(res.statusCode).to.equal(200);
		expect(res.body.ok).to.equal(true);
	});

	it('should return 403 if user has none of the required permissions', async () => {
		const ctx = fakeRequest('user3');
		const res = await API.v1.endpoints['test.permissionsRequired'].get.call(ctx);
		expect(res.statusCode).to.equal(403);
		expect(res.body.success).to.equal(false);
	});
});
