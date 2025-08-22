import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('committees', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 200).notNullable();
    table.text('description');
    table.enum('type', ['standing', 'special', 'ad_hoc']).defaultTo('standing');
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.integer('term_year').notNullable();
    table.date('term_start').notNullable();
    table.date('term_end');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['name']);
    table.index(['type']);
    table.index(['status']);
    table.index(['term_year']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('committees');
}