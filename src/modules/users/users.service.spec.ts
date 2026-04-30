import { RpcException } from '@nestjs/microservices'
import { Test, TestingModule } from '@nestjs/testing'
import { PinoLogger } from 'nestjs-pino'
import { of } from 'rxjs'

import { AccountClientGrpc } from '../../infra/grpc/clients/account.client'

import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'

describe('UsersService', () => {
	let service: UsersService
	let usersRepository: jest.Mocked<UsersRepository>
	let accountClient: jest.Mocked<AccountClientGrpc>

	beforeEach(async () => {
		const mockUsersRepository = {
			findById: jest.fn(),
			create: jest.fn(),
			update: jest.fn()
		}

		const mockAccountClientGrpc = {
			getAccount: jest.fn()
		}

		const mockPinoLogger = {
			setContext: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UsersService,
				{ provide: UsersRepository, useValue: mockUsersRepository },
				{ provide: AccountClientGrpc, useValue: mockAccountClientGrpc },
				{ provide: PinoLogger, useValue: mockPinoLogger }
			]
		}).compile()

		service = module.get<UsersService>(UsersService)
		usersRepository = module.get(UsersRepository)
		accountClient = module.get(AccountClientGrpc)
	})

	it('should be defined', () => {
		expect(service).toBeDefined()
	})

	describe('getMe', () => {
		it('should throw NOT_FOUND if user profile is missing', async () => {
			usersRepository.findById.mockResolvedValue(null)
			await expect(service.getMe({ id: '1' })).rejects.toThrow(
				RpcException
			)
		})

		it('should return user profile combined with account data', async () => {
			usersRepository.findById.mockResolvedValue({
				id: '1',
				name: 'John Doe',
				avatar: 'avatar.png'
			} as any)

			accountClient.getAccount.mockReturnValue(
				of({ phone: '123', email: 'test@test.com' } as any)
			)

			const result = await service.getMe({ id: '1' })

			expect(result).toEqual({
				user: {
					id: '1',
					name: 'John Doe',
					avatar: 'avatar.png',
					phone: '123',
					email: 'test@test.com'
				}
			})
			expect(usersRepository.findById).toHaveBeenCalledWith('1')
			expect(accountClient.getAccount).toHaveBeenCalledWith({ id: '1' })
		})
	})

	describe('create', () => {
		it('should create user profile', async () => {
			usersRepository.create.mockResolvedValue({ id: '1' } as any)

			const result = await service.create({ id: '1' })

			expect(usersRepository.create).toHaveBeenCalledWith({ id: '1' })
			expect(result).toEqual({ ok: true })
		})
	})

	describe('patchUser', () => {
		it('should throw NOT_FOUND if user missing', async () => {
			usersRepository.findById.mockResolvedValue(null)
			await expect(
				service.patchUser({ userId: '1', name: 'New Name' })
			).rejects.toThrow(RpcException)
		})

		it('should update user name', async () => {
			usersRepository.findById.mockResolvedValue({
				id: '1',
				name: 'Old'
			} as any)
			usersRepository.update.mockResolvedValue({} as any)

			const result = await service.patchUser({
				userId: '1',
				name: 'New Name'
			})

			expect(usersRepository.update).toHaveBeenCalledWith('1', {
				name: 'New Name'
			})
			expect(result).toEqual({ ok: true })
		})

		it('should update stripe account id', async () => {
			usersRepository.findById.mockResolvedValue({ id: '1' } as any)
			usersRepository.update.mockResolvedValue({} as any)

			const result = await service.patchUser({
				userId: '1',
				stripeAccountId: 'acct_123'
			})

			expect(usersRepository.update).toHaveBeenCalledWith('1', {
				stripeAccountId: 'acct_123'
			})
			expect(result).toEqual({ ok: true })
		})
	})
})
