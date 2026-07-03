# Redis - VelON IA

## Objetivo

O Redis é responsável pelo cache, filas e armazenamento temporário da plataforma VelON IA.

## Configuração

Imagem:
redis:7-alpine

Container:
velonia_redis

Porta interna:
6379

Rede:
velonia_network

## Segurança

- Senha obrigatória
- Porta não exposta para Internet
- Comunicação apenas pela rede Docker

## Persistência

Volume:

velonia_redis_data

## Teste

```bash
docker exec -it velonia_redis redis-cli -a '' ping
```

Resultado esperado

```
PONG
```
