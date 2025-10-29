#!/usr/bin/env sh
set -eu

# Verifica se TEST_DATABASE_URL está definida
if [ -z "${TEST_DATABASE_URL-}" ]; then
  echo "ERROR: TEST_DATABASE_URL não definida. Ex.: export TEST_DATABASE_URL='postgresql://user:pass@localhost:5432/pitstop_test?schema=public'"
  exit 1
fi

# Define defaults
export NODE_ENV=${NODE_ENV:-test}
export JWT_SECRET=${JWT_SECRET:-test-secret}
# Para o Prisma, DATABASE_URL deve apontar para o banco de teste em ambiente de teste
export DATABASE_URL="$TEST_DATABASE_URL"

# Extrai host e porta da TEST_DATABASE_URL
# Ex.: postgresql://user:pass@host:5432/db?schema=public
url_no_proto=${TEST_DATABASE_URL#*//}
# remove credenciais se existirem
after_at=${url_no_proto#*@}
host_and_rest=${after_at%%/*}

host=${host_and_rest%%:*}
port=${host_and_rest#*:}
if [ "$host" = "$host_and_rest" ]; then
  port=5432
fi

echo "Aguardando Postgres em $host:$port ..."

# Tenta conectar com netcat (nc). Se nc não existir, tenta usar bash com /dev/tcp
wait_seconds=0
max_wait=60
while true; do
  if command -v nc >/dev/null 2>&1; then
    nc -z "$host" "$port" >/dev/null 2>&1 && break
  else
    # tenta /dev/tcp (funciona em muitos sistemas linux)
    (echo >/dev/tcp/$host/$port) >/dev/null 2>&1 && break || true
  fi

  sleep 1
  wait_seconds=$((wait_seconds + 1))
  if [ "$wait_seconds" -ge "$max_wait" ]; then
    echo "Timed out waiting for Postgres at $host:$port"
    exit 2
  fi
done

echo "Postgres acessível. Gerando cliente Prisma e rodando migrações..."

# Garante dependências do node (supondo que já executou npm install localmente) e gera Prisma
npx prisma generate

# Se não houver migrations, usa db push para criar o schema diretamente no banco
# Isso é útil para testes locais onde não mantemos migrations.
npx prisma migrate deploy --schema=./prisma/schema.prisma || true
npx prisma db push --schema=./prisma/schema.prisma

# Roda os testes E2E com as variáveis de ambiente definidas acima
npx jest --testMatch="**/test/auth.e2e-spec.ts" --runInBand --verbose
