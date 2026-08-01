# 🎬 Random Video Player (GitHub Pages)

Um player de vídeos aleatórios moderno, bonito e 100% local, pronto para ser hospedado no **GitHub Pages** ou executado diretamente em qualquer navegador.

## ✨ Recursos

- 📁 **Seleção de Pasta com Subpastas**: Escolha qualquer pasta do seu computador (ou arraste e solte). O player lê recursivamente todos os arquivos de vídeo em subpastas sem enviar nada para servidores externos (tudo roda 100% local no seu navegador).
- 🎲 **Reprodução Aleatória Inteligente**:
  - Modo **Sem Repetição** ativado por padrão (garante que todos os vídeos da pasta sejam sorteados antes de repetir).
  - Histórico de navegação para você poder voltar aos vídeos sorteados anteriormente (botões e atalhos `P` e `N`).
- ⏯️ **Controles Personalizados & Responsivos**:
  - **Play / Pause**
  - **Pular 5 segundos para trás (-5s)** e **para frente (+5s)**
  - **Próximo Vídeo Aleatório**
  - Barra de progresso interativa com preview de tempo ao passar o mouse.
  - Velocidade de reprodução (0.5x até 2.0x).
  - Volume, Mute e Tela Cheia.
  - Ocultamento automático de controles ao reproduzir em tela cheia.
- 📋 **Lista Lateral (Playlist)**: Veja todos os vídeos lidos com o caminho relativo das subpastas e busque por nome/pasta.
- ⌨️ **Atalhos do Teclado**:
  - `Espaço` ou `K`: Play / Pause
  - `Seta Esquerda (←)` ou `J`: Voltar 5 segundos (-5s)
  - `Seta Direita (→)` ou `L`: Avançar 5 segundos (+5s)
  - `N`: Sortear Próximo Vídeo
  - `P`: Vídeo Anterior no Histórico
  - `F`: Tela Cheia
  - `M`: Mutar / Desmutar
  - `Seta Cima (↑)` / `Seta Baixo (↓)`: Ajustar Volume

---

## 🚀 Como Usar no Seu Computador (Local)

1. Basta dar dois cliques no arquivo `index.html` em qualquer navegador (Chrome, Edge, Firefox, Brave, Safari, Opera).
2. Clique no botão **"Escolher Pasta"** ou arraste a pasta de vídeos para a tela.
3. Aproveite os seus vídeos sendo sorteados aleatoriamente!

---

## 🌐 Como Publicar no GitHub Pages

1. Envie os arquivos do projeto para o seu repositório no GitHub:
   ```bash
   git add .
   git commit -m "feat: player de vídeos aleatórios"
   git push origin main
   ```
2. No GitHub, acesse o repositório **random_player**.
3. Vá em **Settings** > **Pages**.
4. Em **Build and deployment** > **Source**, selecione a branch `main` e a pasta `/ (root)`.
5. Clique em **Save**.
6. Em alguns instantes, o link público do seu player estará ativo no formato `https://seu-usuario.github.io/random_player/`.

---

## 💻 Tecnologias

- **HTML5 & CSS3 Vanilla**: Layout responsivo, Glassmorphism, CSS Custom Properties e Animações.
- **JavaScript (ES6+)**: API File System (`webkitdirectory`), Drag and Drop API, Blob URLs e Event Listeners.
