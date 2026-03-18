#!/bin/bash
# setup-commitlint.sh
# Script de configuração do commitlint com detecção ESM/CJS

set -e  # Interrompe o script em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir mensagens com cores
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Função para verificar se um comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar se Node.js e npm estão instalados
print_info "Verificando dependências..."
if ! command_exists node; then
    print_error "Node.js não está instalado. Por favor, instale o Node.js primeiro."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm não está instalado. Por favor, instale o npm primeiro."
    exit 1
fi

print_info "Node.js $(node --version) e npm $(npm --version) encontrados."

# Verificar se package.json existe
if [ ! -f "package.json" ]; then
    print_info "package.json não encontrado. Criando package.json mínimo..."
    cat > package.json << EOF
{
  "name": "intranet-asof",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "commitlint": "commitlint --edit",
    "prepare": "husky install"
  }
}
EOF
    print_info "package.json criado."
fi

# Instalar dependências npm
print_info "Instalando dependências npm..."
npm install --save-dev @commitlint/cli @commitlint/config-conventional husky

# Detectar tipo do projeto (ESM ou CJS)
DETECTED_TYPE="cjs"
if grep -q '"type": "module"' package.json 2>/dev/null; then
    DETECTED_TYPE="esm"
fi

case $DETECTED_TYPE in
    esm)
        print_info "Configurando commitlint para ESM..."
        cat > commitlint.config.js << 'EOF'
import fs from 'fs';

const isGracePeriod = fs.existsSync('.commitlint-grace-period');

export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // Durante grace period: warnings only
        // Após: erro
        'type-enum': isGracePeriod 
            ? [1, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'revert']]
            : [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'revert']],
        
        // Escopes dinâmicos - formato validado, enum desabilitado
        'scope-enum': [0],
        'scope-format': [2, 'always', '^[a-z0-9-]+$'],
        'scope-empty': isGracePeriod ? [1] : [2],
        
        'subject-empty': [2, 'never'],
        'subject-case': [2, 'never', ['upper-case']], // lowercase ou sentence-case
        'subject-max-length': [2, 'always', 50],
        'body-max-line-length': [2, 'always', 72],
    },
};
EOF
        ;;
    *)
        print_info "Configurando commitlint para CJS..."
        cat > commitlint.config.cjs << 'EOF'
const fs = require('fs');

const isGracePeriod = fs.existsSync('.commitlint-grace-period');

module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': isGracePeriod 
            ? [1, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'revert']]
            : [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'revert']],
        'scope-enum': [0],
        'scope-format': [2, 'always', '^[a-z0-9-]+$'],
        'scope-empty': isGracePeriod ? [1] : [2],
        'subject-empty': [2, 'never'],
        'subject-case': [2, 'never', ['upper-case']],
        'subject-max-length': [2, 'always', 50],
        'body-max-line-length': [2, 'always', 72],
    },
};
EOF
        ;;
esac

print_info "commitlint.config criado ($DETECTED_TYPE)."

# Inicializar husky
print_info "Inicializando husky..."
if [ -d ".husky" ]; then
    print_info "husky já está inicializado."
else
    npx husky install
fi

# Criar hook commit-msg
print_info "Configurando hook commit-msg..."
cat > .husky/commit-msg << 'EOFHOOK'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
EOFHOOK
chmod +x .husky/commit-msg

# Criar arquivo de grace period inicial
if [ ! -f ".commitlint-grace-period" ]; then
    touch .commitlint-grace-period
    print_info "Arquivo .commitlint-grace-period criado (modo warnings ativo)."
fi

# Criar template de mensagem de commit
if [ ! -f ".gitmessage" ]; then
    print_info "Criando template .gitmessage..."
    cat > .gitmessage << 'EOFMSG'
# Conventional Commits para Intranet ASOF
# Formato: <tipo>(<escopo>): <descrição>
#
# Tipos:
#   feat     : Nova funcionalidade
#   fix      : Correção de bug
#   docs     : Documentação
#   style    : Formatação, formatação de código
#   refactor : Refatoração de código
#   perf     : Melhoria de performance
#   test     : Adicionando ou corrigindo testes
#   build    : Build system ou dependências
#   ci       : CI configuration
#   chore    : Outras tarefas
#
# Escopos comuns:
#   kanban, calendario, tarefas, contatos, avisos,
#   documentos, reunioes, dashboard, auth, crm, api, ui
#
# Exemplos:
#   feat(kanban): adiciona arrastar e soltar para reordenar tarefas
#   fix(auth): corrige validacao de senha
#   docs(readme): atualiza instrucoes de instalacao
#
# Linhas vazias e comentários (#) serão ignorados.
EOFMSG
    print_info "Template .gitmessage criado."
fi

# Configurar git para usar o template
git config --local commit.template .gitmessage 2>/dev/null || true

print_info "==================================================================="
print_info "Commitlint configurado com sucesso!"
print_info "==================================================================="
echo ""
print_info "O que foi configurado:"
echo "  - Tipo detectado: $DETECTED_TYPE"
echo "  - @commitlint/cli e @commitlint/config-conventional instalados"
echo "  - husky instalado e inicializado"
echo "  - Hook commit-msg configurado"
echo "  - Arquivo commitlint.config.$([ "$DETECTED_TYPE" = "esm" ] && echo "js" || echo "cjs") criado"
echo "  - Template .gitmessage criado"
echo "  - Grace period ativado (warnings only)"
echo ""
print_info "Gerenciamento do Grace Period:"
echo "  📝 Para ativar grace period: touch .commitlint-grace-period"
echo "  🚀 Para desativar: rm .commitlint-grace-period"
echo ""
print_info "Exemplos de commits válidos:"
echo "  feat(kanban): adiciona arrastar e soltar"
echo "  fix(auth): corrige validacao de senha"
echo "  docs(readme): atualiza instrucoes"
echo ""
print_warning "Lembre-se: Todas as mensagens de commit devem seguir o padrão acima."
print_info "==================================================================="
echo ""
print_info "Para desativar os hooks temporariamente:"
echo "  git commit --no-verify -m 'mensagem'"
echo ""
print_info "Para executar este script novamente:"
echo "  bash scripts/setup-commitlint.sh"
echo ""
