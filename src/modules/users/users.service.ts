import { Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { RpcStatus } from '@razom-pay/common'
import type {
	CreateUserRequest,
	GetMeRequest,
	PatchUserRequest
} from '@razom-pay/contracts/gen/users'
import { PinoLogger } from 'nestjs-pino'
import { lastValueFrom } from 'rxjs'

import { AccountClientGrpc } from '../../infra/grpc/clients/account.client'

import { UsersRepository } from './users.repository'

@Injectable()
export class UsersService {
	constructor(
		private readonly logger: PinoLogger,
		private readonly usersRepository: UsersRepository,
		private readonly accountClient: AccountClientGrpc
	) {
		this.logger.setContext(UsersService.name)
	}

	async getMe(data: GetMeRequest) {
		const { id } = data
		this.logger.info(`GetMe requested: userId=${id}`)

		const profile = await this.usersRepository.findById(id)

		if (!profile)
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				message: 'User not found'
			})

		const account = await lastValueFrom(
			this.accountClient.getAccount({ id })
		)

		return {
			user: {
				id: profile.id,
				name: profile.name,
				avatar: profile.avatar,
				phone: account.phone,
				email: account.email,
				...(profile.stripeAccountId && {
					stripeAccountId: profile.stripeAccountId
				})
			}
		}
	}

	async create(data: CreateUserRequest) {
		this.logger.info(`CreateUser requested: userId=${data.id}`)

		await this.usersRepository.create({ id: data.id })

		this.logger.info(`CreateUser completed: userId=${data.id}`)

		return { ok: true }
	}

	async patchUser(data: PatchUserRequest) {
		const { userId, name, stripeAccountId } = data
		this.logger.info(`PatchUser requested: userId=${userId}`)

		const user = await this.usersRepository.findById(userId)

		if (!user)
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				message: 'User not found'
			})

		await this.usersRepository.update(user.id, {
			...(name !== undefined && { name }),
			...(stripeAccountId !== undefined && { stripeAccountId })
		})

		this.logger.info(`PatchUser completed: userId=${userId}`)

		return { ok: true }
	}
}
