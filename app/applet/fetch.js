fetch('https://below400feet.com/').then(r => r.text()).then(t => {
  const matches = t.match(/<img[^>]+src="([^"]+)"[^>]*>/g);
  console.log(matches);
});
