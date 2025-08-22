import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('legislation', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('document_number', 50).unique().notNullable();
    table.enum('type', ['ordinance', 'resolution']).notNullable();
    table.string('title', 500).notNullable();
    table.text('subject_matter').notNullable();
    table.text('content');
    table.text('summary');
    table.enum('classification', ['general', 'special', 'emergency', 'appropriation', 'revenue', 'other']).defaultTo('general');
    table.enum('category', ['administrative', 'fiscal', 'social', 'economic', 'infrastructure', 'environmental', 'other']).defaultTo('other');
    table.enum('status', ['draft', 'first_reading', 'second_reading', 'approved', 'vetoed', 'enacted', 'archived']).defaultTo('draft');
    table.uuid('author_id').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('committee_id').references('id').inTable('committees').onDelete('SET NULL');
    table.integer('term_year').notNullable();
    table.integer('session_number');
    table.date('introduction_date');
    table.date('first_reading_date');
    table.date('second_reading_date');
    table.date('approval_date');
    table.date('enactment_date');
    table.date('effectivity_date');
    table.boolean('has_penal_clause').defaultTo(false);
    table.text('penal_clause');
    table.text('remarks');
    table.string('file_url', 500);
    table.string('watermark_file_url', 500);
    table.integer('version').defaultTo(1);
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.uuid('updated_by').references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['document_number']);
    table.index(['type']);
    table.index(['status']);
    table.index(['classification']);
    table.index(['category']);
    table.index(['term_year']);
    table.index(['author_id']);
    table.index(['committee_id']);
    table.index(['introduction_date']);
    table.index(['approval_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('legislation');
}