# VelON Database Architecture v1.0

## 1. Objetivo

Este documento define a arquitetura oficial do banco de dados da plataforma VelON OS.

A VelON OS será uma plataforma SaaS multiempresa, modular, escalável e preparada para atender organizações de diferentes segmentos.

Este documento será a referência obrigatória para:

- novas tabelas;
- alterações de estrutura;
- migrações;
- integrações;
- APIs;
- automações;
- dashboards;
- agentes de Inteligência Artificial;
- controle de acesso;
- auditoria;
- segurança e isolamento de dados.

---

## 2. Princípios arquiteturais

A arquitetura do banco seguirá os seguintes princípios:

1. Multi-tenancy desde a origem.
2. Isolamento lógico dos dados por tenant.
3. Migrações versionadas e imutáveis.
4. Nenhuma alteração manual em produção.
5. Auditoria das operações críticas.
6. Exclusão lógica quando aplicável.
7. Padronização de datas e horários.
8. Integridade referencial.
9. Índices definidos conforme uso real.
10. Segurança por menor privilégio.
11. Separação clara entre módulos.
12. Compatibilidade com integrações externas.
13. Escalabilidade horizontal da aplicação.
14. Rastreabilidade completa das mudanças.

---

## 3. Estratégia multi-tenant

Cada empresa cliente da VelON será representada por um tenant.

A entidade principal será:

- tenants

As tabelas de negócio deverão possuir:

- tenant_id

Exemplos:

- contatos;
- leads;
- oportunidades;
- propostas;
- contratos;
- tarefas;
- receitas;
- despesas;
- conversas;
- mensagens;
- agentes de IA.

O tenant_id será obrigatório em todas as tabelas que contenham dados pertencentes a clientes.

Tabelas globais poderão não possuir tenant_id.

Exemplos:

- países;
- estados;
- planos SaaS;
- catálogo global de permissões;
- versões da plataforma.

---

## 4. Padrões globais

### Identificadores

O padrão recomendado para novas entidades será UUID.

Exemplo:

id UUID PRIMARY KEY DEFAULT gen_random_uuid()

Tabelas internas, técnicas ou de alto volume poderão utilizar BIGSERIAL quando houver justificativa arquitetural.

### Datas

Campos padronizados:

- criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
- atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
- excluido_em TIMESTAMPTZ NULL

### Auditoria

Quando aplicável:

- criado_por
- atualizado_por
- excluido_por

### Exclusão lógica

Entidades de negócio não deverão ser removidas fisicamente por padrão.

Será utilizado:

- excluido_em;
- ativo;
- status.

### Nomenclatura

Tabelas:

- português;
- letras minúsculas;
- plural;
- snake_case.

Colunas:

- letras minúsculas;
- snake_case.

Chaves estrangeiras:

- nome_da_entidade_id.

Índices:

- idx_tabela_coluna.

Restrições únicas:

- uq_tabela_coluna.

Chaves estrangeiras:

- fk_tabela_entidade.

---

## 5. Organização por módulos

### 5.1 Core

Responsável pela fundação da plataforma.

Entidades previstas:

- tenants;
- empresas;
- unidades;
- usuarios;
- perfis;
- permissoes;
- perfil_permissoes;
- usuario_empresas;
- planos;
- assinaturas;
- configuracoes;
- auditoria_eventos.

### 5.2 CRM

Responsável pela gestão comercial.

Entidades previstas:

- contatos;
- leads;
- oportunidades;
- pipelines;
- etapas_pipeline;
- atividades_comerciais;
- origens_lead;
- motivos_perda;
- etiquetas;
- contato_etiquetas.

### 5.3 Comercial

Responsável por propostas, contratos e vendas.

Entidades previstas:

- produtos;
- servicos;
- tabelas_preco;
- propostas;
- proposta_itens;
- contratos;
- pedidos;
- pedido_itens;
- vendedores;
- metas_comerciais;
- comissoes.

### 5.4 Financeiro

Responsável pela gestão financeira.

Entidades previstas:

- contas_financeiras;
- categorias_financeiras;
- centros_custo;
- contas_receber;
- contas_pagar;
- pagamentos;
- recebimentos;
- movimentacoes_financeiras;
- conciliacoes;
- fluxo_caixa;
- dre_periodos.

### 5.5 WhatsApp

Responsável pelas integrações de atendimento.

Entidades previstas:

- instancias_whatsapp;
- contatos_whatsapp;
- conversas;
- mensagens;
- eventos_whatsapp;
- templates_mensagem;
- filas_atendimento;
- atendentes;
- transferencias_atendimento.

### 5.6 Inteligência Artificial

Responsável pelos agentes e suas configurações.

Entidades previstas:

- agentes_ia;
- prompts;
- versoes_prompt;
- bases_conhecimento;
- documentos_conhecimento;
- memorias_ia;
- execucoes_ia;
- ferramentas_ia;
- agente_ferramentas;
- custos_ia;
- avaliacoes_ia.

### 5.7 Agenda e Operações

Responsável por tarefas, eventos e processos internos.

Entidades previstas:

- tarefas;
- eventos;
- lembretes;
- equipes;
- departamentos;
- processos;
- etapas_processo;
- responsaveis_tarefa;
- comentarios;
- anexos.

### 5.8 Estoque e Logística

Responsável por produtos físicos e movimentações.

Entidades previstas:

- estoques;
- locais_estoque;
- saldos_estoque;
- movimentacoes_estoque;
- fornecedores;
- compras;
- compra_itens;
- expedicoes;
- entregas.

### 5.9 Business Intelligence

Responsável por indicadores e painéis.

Entidades previstas:

- indicadores;
- metas;
- snapshots_indicadores;
- dashboards;
- dashboard_componentes;
- relatorios;
- agendamentos_relatorio.

### 5.10 Integrações

Responsável pelas conexões externas.

Entidades previstas:

- integracoes;
- credenciais_integracao;
- webhooks;
- eventos_integracao;
- filas_integracao;
- logs_integracao;
- sincronizacoes.

---

## 6. Schemas planejados

A adoção de schemas será feita gradualmente.

Schemas previstos:

- core;
- crm;
- comercial;
- financeiro;
- whatsapp;
- ia;
- operacoes;
- estoque;
- bi;
- integracoes;
- auditoria.

O schema public será mantido temporariamente para compatibilidade com o sistema existente.

Nenhuma tabela existente será movida de schema sem:

1. backup;
2. análise de dependências;
3. migração versionada;
4. testes;
5. plano de rollback.

---

## 7. Estado atual do banco

Banco:

- velonia_operacional

Container PostgreSQL:

- velonia_postgres

Tabelas atualmente identificadas no schema public:

- contatos;
- conversas;
- empresas;
- estados_atendimento;
- leads;
- n8n_chat_histories.

Essas tabelas são consideradas legado ativo até que sejam formalmente incorporadas ao modelo versionado.

---

## 8. Migrações existentes

Arquivos identificados:

- 001_catalogo_autoparts.sql;
- 003_catalogo_produtos_v2.sql;
- 004_proposta_itens.sql;
- 005_conversas_ia.sql;
- 006_cliente_vendedor_ia.sql;
- 006_pagamentos.sql;
- 007_financeiro_pagamentos_constraints.sql;
- 008_pedidos_venda.sql;
- 009_pedido_pagamento_unico.sql;
- 010_movimentacoes_estoque.sql;
- 011_expedicao_pedidos.sql;
- 012_eventos_whatsapp.sql.

Problemas identificados:

- ausência da versão 002;
- duplicidade da versão 006;
- inexistência de histórico oficial de execução;
- scripts ainda não consolidados no Git;
- arquivos SQL soltos fora da pasta oficial;
- coexistência das pastas seed e seeds.

Nenhum arquivo antigo deverá ser renomeado, removido ou alterado antes da criação do baseline.

---

## 9. Estratégia de baseline

Será criado um baseline que represente o estado real do banco em produção.

O baseline deverá registrar:

- estrutura atualmente existente;
- tabelas;
- colunas;
- índices;
- constraints;
- funções;
- triggers;
- views;
- permissões;
- proprietários;
- checksums das migrações antigas.

Após o baseline:

- novas migrações serão sequenciais;
- migrações aplicadas serão imutáveis;
- alterações serão feitas apenas por novas versões;
- o banco manterá histórico de execução.

---

## 10. Regras para migrações

1. Nunca editar uma migração já aplicada.
2. Nunca executar scripts diretamente em produção sem registro.
3. Cada migração deve possuir uma única responsabilidade.
4. Cada migração deve ser testada antes da produção.
5. Toda mudança estrutural deve possuir backup.
6. Alterações destrutivas exigem plano de rollback.
7. Migrações devem ser idempotentes quando tecnicamente apropriado.
8. Dados de demonstração não devem ser misturados com estrutura.
9. Seeds devem permanecer separados das migrações.
10. Credenciais nunca devem ser armazenadas no Git.

---

## 11. Segurança

A arquitetura deverá implementar progressivamente:

- usuários de banco separados por serviço;
- princípio do menor privilégio;
- Row Level Security;
- isolamento por tenant_id;
- criptografia de credenciais;
- rotação de segredos;
- auditoria de acesso;
- logs de ações críticas;
- mascaramento de dados sensíveis;
- política de backup e restauração;
- aderência à LGPD.

---

## 12. Próximas etapas

1. Auditar detalhadamente a estrutura atual.
2. Exportar o schema real sem dados.
3. Criar inventário de dependências.
4. Consolidar migrações existentes.
5. Definir ferramenta oficial de migração.
6. Criar baseline.
7. Versionar o diretório database no Git.
8. Criar o Core SaaS.
9. Evoluir o CRM.
10. Integrar backend, frontend, n8n e Metabase.

---

## 13. Status

Documento:

VelON Database Architecture v1.0

Status:

Rascunho arquitetural inicial

Responsável:

VelON Tecnologia

Data de criação:

Julho de 2026
