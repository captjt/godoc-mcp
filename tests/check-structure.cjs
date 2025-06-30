const https = require('https');

https.get('https://pkg.go.dev/fmt', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    // Check if we're getting a different response (maybe JavaScript rendered)
    console.log('Response length:', data.length);
    console.log('Contains "Printf":', data.includes('Printf'));
    console.log('Contains "Stringer":', data.includes('Stringer'));
    
    // Look for any documentation markers
    const docMarkers = data.match(/Documentation-\w+/g);
    console.log('Documentation classes found:', docMarkers ? [...new Set(docMarkers)] : 'none');
    
    // Check for data attributes
    const dataAttrs = data.match(/data-kind="[^"]+"/g);
    console.log('Data-kind attributes:', dataAttrs ? [...new Set(dataAttrs)].slice(0, 10) : 'none');
  });
});