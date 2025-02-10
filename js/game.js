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

async function getMaxPage() {
  const cards = await room.collection('cards').getList();
  if (cards.length === 0) return 1;
  return Math.max(...cards.map(card => card.page), 1);
}

async function getPageCards(pageNum) {
  return await room.collection('cards')
    .filter({ page: pageNum })
    .getList();
}

async function createCard(index, pageCards) {
  const cardElement = document.createElement('div');
  cardElement.className = 'bubble';
  cardElement.innerHTML = `
    <div class="card">
      <div class="card-front">?</div>
      <div class="card-back"></div>
    </div>
  `;
  
  // Find if this card exists in the pageCards array
  const existingCard = pageCards.find(card => card.position === index);

  if (existingCard) {
    const cardDiv = cardElement.querySelector('.card');
    cardDiv.classList.add('flipped');
    cardDiv.querySelector('.card-back').textContent = existingCard.emoji;
    
    cardElement.addEventListener('click', () => {
      document.querySelector('.details-image').textContent = existingCard.emoji;
      document.querySelector('.details-description').textContent = existingCard.description;
    });
  } else {
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
  }

  return cardElement;
}

async function renderGrid() {
  const container = document.querySelector('.bubble-container');
  container.innerHTML = '';
  
  // Fetch all cards for the current page
  const pageCards = await getPageCards(currentPage);
  
  // Create and append cards
  for (let i = 0; i < CARDS_PER_PAGE; i++) {
    const card = await createCard(i, pageCards);
    container.appendChild(card);
  }
  
  // Update page controls
  const maxPage = await getMaxPage();
  document.querySelector('.scroll-up').disabled = currentPage === 1;
  
  // For the down button, we only disable if current page is fully flipped
  // and it's the last page
  const allCardsFlipped = pageCards.length === CARDS_PER_PAGE;
  document.querySelector('.scroll-down').disabled = allCardsFlipped && currentPage === maxPage;
}

async function setupPagination() {
  const upButton = document.querySelector('.scroll-up');
  const downButton = document.querySelector('.scroll-down');

  upButton.addEventListener('click', async () => {
    if (currentPage > 1) {
      currentPage--;
      await renderGrid();
    }
  });

  downButton.addEventListener('click', async () => {
    currentPage++;
    await renderGrid();
  });
}

// Subscribe to changes in the cards collection
room.collection('cards').subscribe(async (cards) => {
  const pageCards = await getPageCards(currentPage);
  pageCards.forEach(card => {
    const cardElement = document.querySelector(`.bubble:nth-child(${card.position + 1})`);
    if (cardElement) {
      const cardDiv = cardElement.querySelector('.card');
      if (!cardDiv.classList.contains('flipped')) {
        cardDiv.classList.add('flipped');
        cardDiv.querySelector('.card-back').textContent = card.emoji;
      }
    }
  });
});

// Initialize the game
setupPagination();
renderGrid();