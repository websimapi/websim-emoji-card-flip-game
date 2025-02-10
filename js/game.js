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
  const cards = await room.collection('cards')
    .filter({ page: pageNum })
    .getList();
  return cards;
}

async function createCard(index, existingCards) {
  const cardElement = document.createElement('div');
  cardElement.className = 'bubble';
  cardElement.innerHTML = `
    <div class="card">
      <div class="card-front">?</div>
      <div class="card-back"></div>
    </div>
  `;
  
  const existingCard = existingCards.find(card => card.position === index);

  if (existingCard) {
    const cardDiv = cardElement.querySelector('.card');
    cardDiv.classList.add('flipped');
    const cardBack = cardDiv.querySelector('.card-back');
    cardBack.textContent = existingCard.emoji;
    
    cardElement.addEventListener('click', () => {
      document.querySelector('.details-image').textContent = existingCard.emoji;
      document.querySelector('.details-description').textContent = existingCard.description;
    });
  } else {
    cardElement.addEventListener('click', async function() {
      const cardDiv = cardElement.querySelector('.card');
      if (!cardDiv.classList.contains('flipped')) {
        const { emoji, description } = await generateEmoji();
        
        await room.collection('cards').create({
          position: index,
          page: currentPage,
          emoji: emoji,
          description: description
        });

        cardDiv.classList.add('flipped');
        const cardBack = cardDiv.querySelector('.card-back');
        cardBack.textContent = emoji;
        
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
  
  // First get all cards for the current page
  const pageCards = await getPageCards(currentPage);
  
  // Create and append all cards for the current page
  for (let i = 0; i < CARDS_PER_PAGE; i++) {
    const card = await createCard(i, pageCards);
    container.appendChild(card);
  }
  
  // Update navigation buttons
  const maxPage = await getMaxPage();
  document.querySelector('.scroll-up').disabled = currentPage === 1;
  
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
    const maxPage = await getMaxPage();
    const currentPageCards = await getPageCards(currentPage);
    
    if (currentPageCards.length === CARDS_PER_PAGE && currentPage === maxPage) {
      // Only create new page if current page is full
      currentPage = maxPage + 1;
    } else {
      currentPage++;
    }
    await renderGrid();
  });
}

// Subscribe to real-time card updates
room.collection('cards').subscribe(async (cards) => {
  const currentPageCards = cards.filter(card => card.page === currentPage);
  
  currentPageCards.forEach(card => {
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