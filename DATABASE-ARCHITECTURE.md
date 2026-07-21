# Arquitetura de Bancos da VelON

## Banco principal da aplicação

Nome: velonia

Responsável pelos módulos próprios da VelON:

- CRM
- Leads
- Vendedores
- Clientes
- Pipeline
- Oportunidades
- Propostas
- Atividades
- Dashboard
- Financeiro
- Inteligência comercial

## Bancos auxiliares

- metabase: banco interno do Metabase
- bancos ou schemas da Evolution API: dados técnicos da integração WhatsApp

## Banco legado

- velonia_operacional

O banco velonia_operacional não deve receber novos módulos ou dados.
Ele será mantido temporariamente apenas para conferência e recuperação.
