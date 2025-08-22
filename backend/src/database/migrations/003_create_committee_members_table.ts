import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('committee_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('committee_id').notNullable().references('id').inTable('committees').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('role', ['chairperson', 'vice_chairperson', 'member', 'secretary']).defaultTo('member');
    table.date('appointment_date').notNullable();
    table.date('end_date');
    table.enum('status', ['active', 'inactive', 'resigned']).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Unique constraint to prevent duplicate memberships
    table.unique(['committee_id', 'user_id']);
    
    // Indexes
    table.index(['committee_id']);
    table.index(['user_id']);
    table.index(['role']);
    table.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('committee_members');
}