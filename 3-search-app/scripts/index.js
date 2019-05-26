
// Elements
const form = document.querySelector('form');
const input = form.querySelector('input');
const autoCompleteList = document.querySelector('.autocomplete');
const searchResultList = document.querySelector('.search-result');
const searchHistoryWrapper = document.querySelector('#searchHistory');
const searchHistoryList = document.querySelector('.search-history');
const clearHistoryBtn = document.querySelector('#clearHistory');

// This should come from .env file in a build process
const API_KEY = '88ecc76de66b71860e8149c6f71ce5c4';

const KEY_CODE = {
  ENTER: 13,
  UP: 38,
  DOWN: 40,
}
function sanitizeHTML(str) {
  var temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
};

// Search Input + Auto Complete functions

function emptyAutocompleteList() {
  autoCompleteList.innerHTML = null;
  autoCompleteList.hidden = true;
}

function createAutocompleteItem(item) {
  return `<li class="autocomplete__item" id="${item.id}" onclick="autoCompleteInput('${item.title}')">${item.title}</li>`;
}

async function createAutoCompleteList(query) {
  const movies = await fetchMovies(query);
  const autoCompleteList = document.querySelector('.autocomplete');

  // Create autocomplete suggestions and add to DOM
  let html = '';
  if (!movies || movies.length === 0) {
    html += `<li class="autocomplete__item autocomplete__item--notfound">No results found</li>`
  } else {
    movies.forEach(movie => {
      html += createAutocompleteItem(movie);
    });
  }

  autoCompleteList.innerHTML = html;
  autoCompleteList.hidden = false;
}

function autoCompleteInput(query) {
  const form = document.querySelector('form');
  const input = form.querySelector('input');
  if (!query) return;
  input.value = query;
  submitForm();
}

async function fetchMovies(query) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=en-US&query=${query}&page=1&include_adult=false`);
    const data = await res.json();
    return data.results.map(movie => ({ id: movie.id, title: movie.title, poster: movie.poster_path }));
  } catch (err) {
    throw err;
  }
}

async function submitForm() {
  const query = sanitizeHTML(input.value);
  if (!query) return;

  const item = createNewSearchHistoryEntry(query);
  addItemToSearchHistory(item);

  const movies = await fetchMovies(query);
  if (!movies) return;

  // Add result to DOM  
  let html = '';
  movies.forEach(item => {
    html += createSearchResultItem(item);
  });
  searchResultList.innerHTML = html;

  emptyAutocompleteList();
  input.value = '';
}

function onFormSubmit(event) {
  event.preventDefault();
  return submitForm();
}

// Search Result functions
function createSearchResultItem(item) {
  return `<li class="search-result__item" id="${item.id}">
    ${item.poster ? `<img class="search-result__image" src="https://image.tmdb.org/t/p/w185/${item.poster}">` : `<div class="search-result__image--notfound"></div>`}
    ${item.title} 
  </li>`;
}


// Search History functions

function getSearchHistory() {
  const searchHistory = localStorage.getItem('searchHistory');
  if (searchHistory !== 'undefined') {
    return JSON.parse(searchHistory);
  }
  return null;
}

function clearSearchHistory() {
  // Clear DOM
  searchHistoryWrapper.hidden = true;
  searchHistoryList.innerHTML = null;

  // Clear localStorage
  return localStorage.removeItem('searchHistory');
}

function createNewSearchHistoryEntry(query) {
  return {
    id: JSON.stringify(Date.now()),
    timestamp: new Date(),
    query: query
  }
}

function createSearchHistoryItem(item) {
  return `<li class="search-history__item" id="${item.id}">${item.query} 
    <span class="search-history__timestamp">${createTimeStampFromString(item.timestamp)}</span>
    <button onclick="removeItemFromSearchHistory('${item.id}')" class="search-history__delete-item" aria-label="Delete">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path
        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        <path d="M0 0h24v24H0z" fill="none" />
      </svg>
    </button>
  </li>`;
}

function createSearchHistoryList() {
  // Get localStorage
  const searchHistory = getSearchHistory();
  if (!searchHistory) return null;

  // Create list items and add list to DOM
  let html = '';
  searchHistory.forEach(item => {
    html += createSearchHistoryItem(item)
  });
  searchHistoryList.innerHTML = html;

  // Make search history visible
  searchHistoryWrapper.hidden = false;
}

function createTimeStampFromString(timestamp) {
  function pad(date) {
    return date.toString().padStart(2, '0')
  }

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function addItemToSearchHistory(item) {
  // Add item to DOM
  searchHistoryList.innerHTML += createSearchHistoryItem(item);
  searchHistoryWrapper.hidden = false;

  // Add item to localStorage
  const searchHistory = getSearchHistory();
  if (!searchHistory) {
    return localStorage.setItem('searchHistory', JSON.stringify([item]));
  }
  return localStorage.setItem('searchHistory', JSON.stringify([...searchHistory, item]));
}

function removeItemFromSearchHistory(id) {
  // Remove element from DOM
  const element = document.getElementById(id);
  const parent = element.parentNode;
  parent.removeChild(element);

  // If last entry is removed, hide search history
  if (parent.childNodes.length === 0) {
    searchHistoryWrapper.hidden = true;
  }

  // Remove item from local storage 
  const searchHistory = getSearchHistory();
  if (!searchHistory) {
    return null;
  }
  return localStorage.setItem('searchHistory', JSON.stringify(searchHistory.filter(item => item.id !== id)));
}

function removeActiveFromListItems(x) {
  const listItems = autoCompleteList.querySelectorAll('.autocomplete__item');
  Array.from(listItems).forEach(item => item.classList.remove("autocomplete__item--is-active"));
}

document.addEventListener('DOMContentLoaded', () => {
  createSearchHistoryList();
  let currentAutoCompleteIndex = -1;

  form.addEventListener('submit', onFormSubmit);

  input.addEventListener('input', (event) => {
    if (!input.value) {
      emptyAutocompleteList();
    } else {
      createAutoCompleteList(input.value);
    }
    currentAutoCompleteIndex = -1;
  });

  input.addEventListener('keydown', (event) => {
    // If autoCompleteList is visible, set active autocomplete list item
    if (autoCompleteList.hidden === false) {
      if (event.keyCode == KEY_CODE.DOWN) {
        currentAutoCompleteIndex++;
        setActiveListItem(currentAutoCompleteIndex);
      } else if (event.keyCode == KEY_CODE.UP) {
        currentAutoCompleteIndex--;
        setActiveListItem(currentAutoCompleteIndex);
      } else if (event.keyCode == KEY_CODE.ENTER) {
        // If Enter, submit form with active list item
        event.preventDefault();
        if (currentAutoCompleteIndex > -1) {
          if (autoCompleteList) {
            const listItems = autoCompleteList.querySelectorAll('.autocomplete__item');
            input.value = listItems[currentAutoCompleteIndex].textContent;
            submitForm();
          }
        }
      }
    }

    function setActiveListItem() {
      const listItems = autoCompleteList.querySelectorAll('.autocomplete__item');

      removeActiveFromListItems();
      if (currentAutoCompleteIndex >= listItems.length) currentAutoCompleteIndex = 0;
      if (currentAutoCompleteIndex < 0) currentAutoCompleteIndex = (listItems.length - 1);
      listItems[currentAutoCompleteIndex].classList.add("autocomplete__item--is-active");
    }
  });


  clearHistoryBtn.addEventListener('click', clearSearchHistory);

});