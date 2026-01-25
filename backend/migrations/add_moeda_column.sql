-- Migração: Adicionar coluna 'moeda' em todas as tabelas financeiras
-- Execute este script no banco de dados SQLite/PostgreSQL

-- Adicionar coluna moeda na tabela transactions
ALTER TABLE transactions ADD COLUMN moeda VARCHAR(3) DEFAULT 'BRL' NOT NULL;

-- Adicionar coluna moeda na tabela contas_fixas  
ALTER TABLE contas_fixas ADD COLUMN moeda VARCHAR(3) DEFAULT 'BRL' NOT NULL;

-- Adicionar coluna moeda na tabela investimentos
ALTER TABLE investimentos ADD COLUMN moeda VARCHAR(3) DEFAULT 'BRL' NOT NULL;

-- Adicionar coluna moeda na tabela metas
ALTER TABLE metas ADD COLUMN moeda VARCHAR(3) DEFAULT 'BRL' NOT NULL;

-- Verificar se as colunas foram adicionadas
-- SELECT * FROM transactions LIMIT 1;
-- SELECT * FROM contas_fixas LIMIT 1;
-- SELECT * FROM investimentos LIMIT 1;
-- SELECT * FROM metas LIMIT 1;
