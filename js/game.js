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
    
    // Update details panel when clicking already flipped card
    cardElement.addEventListener('click', () => {
      document.querySelector('.details-image').textContent = existingCard[0].emoji;
      document.querySelector('.details-description').textContent = existingCard[0].description;
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
  
  for (let i = 0; i < CARDS_PER_PAGE; i++) {
    const card = await createCard(i);
    container.appendChild(card);
  }
  
  // Update page controls
  const maxPage = await getMaxPage();
  document.querySelector('.scroll-up').disabled = currentPage === 1;
  document.querySelector('.scroll-down').disabled = currentPage === maxPage && 
    document.querySelectorAll('.card.flipped').length < CARDS_PER_PAGE;
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

room.collection('cards').subscribe((cards) => {
  cards.forEach(card => {
    if (card.page === currentPage) {
      const cardElement = document.querySelector(`.bubble:nth-child(${card.position + 1})`);
      if (cardElement) {
        const cardDiv = cardElement.querySelector('.card');
        if (!cardDiv.classList.contains('flipped')) {
          cardDiv.classList.add('flipped');
          cardDiv.querySelector('.card-back').textContent = card.emoji;
        }
      }
    }
  });
});

setupPagination();
renderGrid();