import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('communications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('reference_number', 50).unique().notNullable();
    table.enum('type', ['incoming', 'outgoing']).notNullable();
    table.enum('category', ['letter', 'memorandum', 'request', 'complaint', 'suggestion', 'other']).notNullable();
    table.string('subject', 500).notNullable();
    table.text('content');
    table.string('origin', 200);
    table.string('recipient', 200);
    table.date('date_received');
    table.date('date_sent');
    table.date('due_date');
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
    table.enum('status', ['pending', 'in_progress', 'completed', 'referred', 'archived']).defaultTo('pending');
    table.uuid('referred_to_committee_id').references('id').inTable('committees').onDelete('SET NULL');
    table.uuid('assigned_to_user_id').references('id').inTable('users').onDelete('SET NULL');
    table.text('action_taken');
    table.text('remarks');
    table.string('file_url', 500);
    table.string('watermark_file_url', 500);
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.uuid('updated_by').references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['reference_number']);
    table.index(['type']);
    table.index(['category']);
    table.index(['status']);
    table.index(['priority']);
    table.index(['date_received']);
    table.index(['date_sent']);
    table.index(['referred_to_committee_id']);
    table.index(['assigned_to_user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('communications');
}