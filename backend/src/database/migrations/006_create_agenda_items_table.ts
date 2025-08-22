import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('agenda_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('agenda_id').notNullable().references('id').inTable('agendas').onDelete('CASCADE');
    table.integer('item_number').notNullable();
    table.string('title', 500).notNullable();
    table.text('description');
    table.enum('type', ['legislation', 'communication', 'report', 'announcement', 'other']).notNullable();
    table.enum('status', ['pending', 'in_progress', 'completed', 'deferred', 'referred']).defaultTo('pending');
    table.uuid('legislation_id').references('id').inTable('legislation').onDelete('SET NULL');
    table.uuid('committee_id').references('id').inTable('committees').onDelete('SET NULL');
    table.uuid('presenter_id').references('id').inTable('users').onDelete('SET NULL');
    table.integer('time_allocation'); // in minutes
    table.text('discussion_notes');
    table.text('action_taken');
    table.text('remarks');
    table.integer('order_of_business').notNullable();
    table.boolean('requires_vote').defaultTo(false);
    table.enum('vote_result', ['approved', 'rejected', 'deferred', 'referred', 'no_action']).defaultTo('no_action');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Unique constraint for agenda item order
    table.unique(['agenda_id', 'item_number']);
    
    // Indexes
    table.index(['agenda_id']);
    table.index(['item_number']);
    table.index(['type']);
    table.index(['status']);
    table.index(['legislation_id']);
    table.index(['committee_id']);
    table.index(['order_of_business']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('agenda_items');
}