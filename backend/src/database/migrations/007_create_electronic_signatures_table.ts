import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('electronic_signatures', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('document_id').notNullable(); // Can be legislation_id or agenda_id
    table.string('document_type', 50).notNullable(); // 'legislation', 'agenda', 'minutes'
    table.uuid('signer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('signature_type', ['approval', 'endorsement', 'certification', 'attestation']).notNullable();
    table.text('signature_data').notNullable(); // Base64 encoded signature image or coordinates
    table.text('signature_metadata'); // JSON metadata about the signature
    table.string('ip_address', 45);
    table.string('user_agent', 500);
    table.timestamp('signed_at').defaultTo(knex.fn.now());
    table.boolean('is_valid').defaultTo(true);
    table.text('invalidation_reason');
    table.uuid('invalidated_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('invalidated_at');
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['document_id']);
    table.index(['document_type']);
    table.index(['signer_id']);
    table.index(['signature_type']);
    table.index(['signed_at']);
    table.index(['is_valid']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('electronic_signatures');
}