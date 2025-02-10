const room = new WebsimSocket();
let currentPage = 1;
const CARDS_PER_PAGE = 30;

async function generateEmoji() {
  const response = await fetch('/api/ai_completion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `Generate a unique, interesting emoji combination (2-3 emojis) that tells a tiny story or creates a fun scene.
      
      interface Response {
        emoji: string;
        description: string;
      }
      
      example: {
        "emoji": "🌙🎭✨",
        "description": "A magical night at the theater"
      }`,
      data: "Generate a unique emoji combination"
    }),
  });
  return await response.json();
}

async function createCard(index) {
  const cardElement = document.createElement('div');
  cardElement.className = 'bubble';
  cardElement.innerHTML = `
    <div class="card">
      <div class="card-front">?</div>
      <div class="card-back"></div>
    </div>
  `;
  
  const existingCard = await room.collection('cards')
    .filter({ position: index, page: currentPage })
    .getList();

  if (existingCard.length > 0) {
    cardElement.querySelector('.card').classList.add('flipped');
    cardElement.querySelector('.card-back').textContent = existingCard[0].emoji;
  }

  cardElement.addEventListener('click', async function() {
    if (!cardElement.querySelector('.card').classList.contains('flipped')) {
      const { emoji, description } = await generateEmoji();
      
      await room.collection('cards').create({
        position: index,
        page: currentPage,
        emoji: emoji,
        description: description
      });

      cardElement.querySelector('.card').classList.add('flipped');
      cardElement.querySelector('.card-back').textContent = emoji;
      
      document.querySelector('.details-image').textContent = emoji;
      document.querySelector('.details-description').textContent = description;
    }
  });

  return cardElement;
}

async function renderGrid() {
  const container = document.querySelector('.bubble-container');
  container.innerHTML = '';
  
  for (let i = 0; i < CARDS_PER_PAGE; i++) {
    const card = await createCard(i);
    container.appendChild(card);
  }
}

document.querySelector('.pagination').innerHTML = `
  <button class="page-button" id="prevPage">Previous</button>
  <span class="page-info" id="currentPage">Page 1 of 5</span>
  <button class="page-button" id="nextPage">Next</button>
`;

document.getElementById('prevPage').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    document.getElementById('currentPage').textContent = `Page ${currentPage} of 5`;
    renderGrid();
  }
});

document.getElementById('nextPage').addEventListener('click', () => {
  currentPage++;
  document.getElementById('currentPage').textContent = `Page ${currentPage} of 5`;
  renderGrid();
});

room.collection('cards').subscribe((cards) => {
  cards.forEach(card => {
    if (card.page === currentPage) {
      const cardElement = document.querySelector(`.bubble:nth-child(${card.position + 1})`);
      if (cardElement) {
        cardElement.querySelector('.card').classList.add('flipped');
        cardElement.querySelector('.card-back').textContent = card.emoji;
      }
    }
  });
});

renderGrid();