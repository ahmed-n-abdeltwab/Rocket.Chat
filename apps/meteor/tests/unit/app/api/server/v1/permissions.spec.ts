import { expect } from 'chai';
import { before, describe, it } from 'mocha';
import proxyquire from 'proxyquire';
import sinon from 'sinon';

import type { APIClass } from '../../../../../../app/api/server/ApiClass.ts';

const userPermissions: { [k: string]: string[] } = {
	'user-with-all-permissions': ['manage-outgoing-integrations', 'manage-own-outgoing-integrations'],
	'user-with-some-permissions': ['manage-outgoing-integrations'],
	'user-with-no-permissions': [],
};

const mockHasPermission = (userId: string, permissions: string[]): boolean => {
	return permissions.every((permission) => userPermissions[userId]?.includes(permission));
};

const mockHasAtLeastOnePermission = (userId: string, permissions: string[]): boolean => {
	return permissions.some((permission) => userPermissions[userId]?.includes(permission));
};

const models = {
	Subscriptions: {
		findOneByRoomIdAndUserId: sinon.stub(),
		setGroupE2EKey: sinon.stub(),
		setGroupE2ESuggestedKey: sinon.stub(),
	},
	Rooms: {
		removeUsersFromE2EEQueueByRoomId: sinon.stub(),
	},
};

const { APIClass: PatchedApiClass } = proxyquire('../../../../../../app/api/server/ApiClass', {
	'../../authorization/server/functions/hasPermission': {
		hasAllPermissionAsync: mockHasPermission,
		hasAtLeastOnePermissionAsync: mockHasAtLeastOnePermission,
	},
	'@rocket.chat/models': { ...models, '@global': true },
	'meteor/meteor': sinon.stub(),
	'meteor/check': sinon.stub(),
	'meteor/accounts-base': {
		Accounts: {
			sendEnrollmentEmail: sinon.stub(),
			insertUserDoc: sinon.stub(),
			_bcryptRounds: () => 10,
		},
	},
	'../../../lib/callbacks': {
		run: sinon.stub(),
	},
	'../../settings/server': {
		settings: { get: sinon.stub() },
	},
	'../../lib/server/functions/addUserToDefaultChannels': {
		addUserToDefaultChannels: sinon.stub(),
	},
	'../../lib/server/functions/getUsernameSuggestion': {
		getUsernameSuggestion: sinon.stub(),
	},
	'../../lib/server/functions/saveUserIdentity': {
		saveUserIdentity: sinon.stub(),
	},
	'../../lib/server/functions/setUserActiveStatus': {
		setUserActiveStatus: sinon.stub(),
	},
	'../../lib/server/lib/notifyListener': {
		notifyOnUserChange: sinon.stub(),
	},
	'bcrypt': {
		'hash': sinon.stub(),
		'@global': true,
	},
	'@rocket.chat/sha256': {
		SHA256: sinon.stub(),
	},
});

describe('API Permissions', () => {
	let api: APIClass;

	before(() => {
		api = new PatchedApiClass({
			useDefaultAuth: true,
			prettyJson: true,
			enableCors: true,
			authOrAnonRequired: false,
		});

		api.addRoute(
			'test-permissions',
			{
				authRequired: true,
				permissionsRequired: {
					GET: { permissions: ['manage-outgoing-integrations', 'manage-own-outgoing-integrations'], operation: 'hasAny' },
					POST: { permissions: ['manage-outgoing-integrations', 'manage-own-outgoing-integrations'], operation: 'hasAll' },
				},
			},
			{
				get() {
					return api.success({ status: 'success' });
				},
				post() {
					return api.success({ status: 'success' });
				},
			},
		);
	});

	describe('hasAny', () => {
		it('should grant access if the user has one of the required permissions', async () => {
			const endpoint = api.router.match('get', '/test-permissions');
			const context = {
				request: new Request('http://localhost:3000/api/v1/test-permissions'),
				userId: 'user-with-some-permissions',
			};

			const result = await endpoint.action.call(context);

			expect(result.body).to.deep.equal({ status: 'success', success: true });
		});

		it('should deny access if the user has none of the required permissions', async () => {
			const endpoint = api.router.match('get', '/test-permissions');
			const context = {
				request: new Request('http://localhost:3000/api/v1/test-permissions'),
				userId: 'user-with-no-permissions',
			};

			let error;
			try {
				await endpoint.action.call(context);
			} catch (e) {
				error = e;
			}

			expect(error.message).to.equal('User does not have the permissions required for this action');
		});
	});

	describe('hasAll', () => {
		it('should grant access if the user has all of the required permissions', async () => {
			const endpoint = api.router.match('post', '/test-permissions');
			const context = {
				request: new Request('http://localhost:3000/api/v1/test-permissions'),
				userId: 'user-with-all-permissions',
			};

			const result = await endpoint.action.call(context);

			expect(result.body).to.deep.equal({ status: 'success', success: true });
		});

		it('should deny access if the user has only some of the required permissions', async () => {
			const endpoint = api.router.match('post', '/test-permissions');
			const context = {
				request: new Request('http://localhost:3000/api/v1/test-permissions'),
				userId: 'user-with-some-permissions',
			};

			let error;
			try {
				await endpoint.action.call(context);
			} catch (e) {
				error = e;
			}

			expect(error.message).to.equal('User does not have the permissions required for this action');
		});
	});
});
