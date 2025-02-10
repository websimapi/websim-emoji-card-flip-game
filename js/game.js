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

async function doesPageExist(pageNum) {
  const cards = await room.collection('cards')
    .filter({ page: pageNum })
    .getList();
  return cards.length > 0;
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
  
  const existingCards = await room.collection('cards')
    .filter({ position: index, page: currentPage })
    .getList();

  if (existingCards.length > 0) {
    const existingCard = existingCards[0];
    cardElement.querySelector('.card').classList.add('flipped');
    cardElement.querySelector('.card-back').textContent = existingCard.emoji;
    
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

async function updateCurrentPageData() {
  const pageCards = await room.collection('cards').filter({ page: currentPage }).getList();
  pageCards.forEach(card => {
    const cardElement = document.querySelector(`.bubble-container .bubble:nth-child(${card.position + 1})`);
    if (cardElement) {
      const cardDiv = cardElement.querySelector('.card');
      if (!cardDiv.classList.contains('flipped')) {
        cardDiv.classList.add('flipped');
        cardDiv.querySelector('.card-back').textContent = card.emoji;
      }
    }
  });
}

async function renderGrid() {
  const container = document.querySelector('.bubble-container');
  container.innerHTML = '';
  
  for (let i = 0; i < CARDS_PER_PAGE; i++) {
    const card = await createCard(i);
    container.appendChild(card);
  }
  
  await updateCurrentPageData();
  
  // Update page controls
  const maxPage = await getMaxPage();
  document.querySelector('.scroll-up').disabled = currentPage === 1;
  
  const currentPageCards = await room.collection('cards').filter({ page: currentPage }).getList();
  const allCardsFlipped = currentPageCards.length === CARDS_PER_PAGE;
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
    currentPage++;
    await renderGrid();
    upButton.disabled = currentPage === 1;
  });
}

// Subscribe to changes in the cards collection and update current page data
room.collection('cards').subscribe(() => {
  updateCurrentPageData();
});

// Initialize the game
setupPagination();
renderGrid();