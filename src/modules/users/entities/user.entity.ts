import { nanoid } from 'nanoid'
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'

@Entity({ name: 'users' })
export class UserEntity {
	@PrimaryColumn()
	id: string = nanoid()

	@Column({ type: 'varchar', nullable: true })
	name?: string | null

	@Column({ type: 'varchar', nullable: true })
	avatar?: string | null

	@Column({
		name: 'stripe_account_id',
		type: 'varchar',
		nullable: true,
		unique: true
	})
	stripeAccountId?: string | null

	@CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
	createdAt!: Date

	@CreateDateColumn({ name: 'updated_at', type: 'timestamptz' })
	updatedAt!: Date
}
