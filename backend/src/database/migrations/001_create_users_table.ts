import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('username', 50).unique().notNullable();
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('middle_name', 100);
    table.string('position', 100).notNullable();
    table.string('department', 100);
    table.enum('role', ['admin', 'secretary', 'council_member', 'vice_mayor', 'staff', 'public']).notNullable();
    table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
    table.string('phone', 20);
    table.string('avatar_url', 500);
    table.boolean('is_verified').defaultTo(false);
    table.timestamp('last_login');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['username']);
    table.index(['email']);
    table.index(['role']);
    table.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}