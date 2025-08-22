import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('agendas', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('agenda_number', 50).unique().notNullable();
    table.enum('session_type', ['regular', 'special', 'joint']).notNullable();
    table.date('session_date').notNullable();
    table.time('session_time').notNullable();
    table.string('venue', 200);
    table.text('call_to_order');
    table.text('invocation');
    table.text('national_anthem');
    table.text('dagupan_hymn');
    table.text('roll_call');
    table.text('approval_of_minutes');
    table.text('communications');
    table.text('committee_reports');
    table.text('unfinished_business');
    table.text('new_business');
    table.text('other_matters');
    table.text('adjournment');
    table.enum('status', ['draft', 'published', 'in_session', 'completed', 'cancelled']).defaultTo('draft');
    table.integer('term_year').notNullable();
    table.integer('session_number').notNullable();
    table.uuid('presiding_officer_id').references('id').inTable('users');
    table.uuid('secretary_id').references('id').inTable('users');
    table.text('session_notes');
    table.text('transcription');
    table.string('file_url', 500);
    table.string('watermark_file_url', 500);
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.uuid('updated_by').references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['agenda_number']);
    table.index(['session_type']);
    table.index(['session_date']);
    table.index(['status']);
    table.index(['term_year']);
    table.index(['session_number']);
    table.index(['presiding_officer_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('agendas');
}