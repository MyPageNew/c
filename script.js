document.getElementById("searchForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const input = document.getElementById("searchInput").value.trim();
    const resultDiv = document.getElementById("result");
    const iframe = document.getElementById("filmFrame");
    const downloadLink = document.getElementById("downloadLink");

    resultDiv.innerHTML = "";
    downloadLink.style.display = "none"; // Hide the download link initially

    if (/^\d+$/.test(input) || input.includes("kinopoisk")) {
        const number = input.match(/\d+/)[0];
        const url = `https://ddbb.lol?id=${number}&n=0`;
        iframe.src = url;

        // Save only the number to localStorage
        localStorage.setItem("selectedNumber", number);

        // Call fetchTitleAndHLS with the extracted number
        fetchTitleAndHLS(number);
    } else {
        const searchUrl = `https://www.kinopoisk.ru/index.php?kp_query=${encodeURIComponent(input)}`;
        const proxyUrl = 'https://api.allorigins.win/raw?url=';

        try {
            // Show loading message
            resultDiv.innerHTML = "<p>Loading...</p>";

            const res = await fetch(proxyUrl + searchUrl);
            if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            const searchResults = doc.querySelectorAll(".search_results .element");
            if (searchResults.length === 0) {
                resultDiv.innerHTML = "No results found.";
                return;
            }

            resultDiv.innerHTML = ""; // Clear loading message after fetch ends

            searchResults.forEach((result) => {
                const titleElement = result.querySelector(".name a.js-serp-metrika");
                const yearElement = result.querySelector(".year");
                const durationElement = result.querySelector(".gray");

                if (titleElement) {
                    const dataId = titleElement.getAttribute("data-id");

                    const card = document.createElement("div");
                    card.className = "movie-card";
                    card.innerHTML = `
        <img src="https://www.kinopoisk.ru/images/sm_film/${dataId}.jpg" alt="${titleElement.textContent.trim()}">
        <div class="movie-info">
            <div class="movie-title">${titleElement.textContent.trim()}</div>
            <div class="movie-year">${yearElement?.textContent || "Unknown Year"}</div>
            <div class="movie-duration">${durationElement?.textContent || ""}</div>
        </div>`;

                    // Add click event to the card
                    card.addEventListener("click", function () {
                        const url = `https://ddbb.lol?id=${dataId}&n=0`;
                        iframe.src = url; // Send dataId to iframe
                        // console.log(`Iframe updated with URL: ${url}`);

                        // Save only the number to localStorage
                        localStorage.setItem("selectedNumber", dataId);

                        // Call fetchTitleAndHLS for the selected movie
                        fetchTitleAndHLS(dataId);
                    });

                    resultDiv.appendChild(card);
                }
            });
        } catch (error) {
            console.error("Error:", error.message);
            resultDiv.innerHTML = "An error occurred while fetching data.";
        }

    }
});

// Function to load the saved number from localStorage
function loadFilmFromLocalStorage() {
    const savedNumber = localStorage.getItem("selectedNumber");
    if (savedNumber) {
        const iframe = document.getElementById("filmFrame");
        const url = `https://ddbb.lol?id=${savedNumber}&n=0`;
        iframe.src = url; // Set the iframe source to the saved URL

        // Optionally, call fetchTitleAndHLS to refresh the HLS links or title
        fetchTitleAndHLS(savedNumber);
    }
}

// Call loadFilmFromLocalStorage on page load
window.addEventListener("load", loadFilmFromLocalStorage);

async function fetchTitleAndHLS(extractedNumber) {
    const apiUrl = `https://kinobox.tv/api/players?kinopoisk=${extractedNumber}&sources=turbo%2Ccollaps%2Calloha%2Cvibix%2Cvideocdn%2Chdvb%2Ckodik`;

    try {
        const res = await fetch(apiUrl);
        if (!res.ok) {
            throw new Error(`Request failed: ${res.status}`);
        }

        const data = await res.json(); // Parse the JSON response

        // Extract iframeUrl from the second object in the response (index 1)
        const iframeUrl = data[1]?.translations?.[0]?.iframeUrl;

        if (iframeUrl) {
            // console.log("Iframe URL:", iframeUrl);

            // Fetch the iframe content
            const response = await fetch(iframeUrl);
            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            const html = await response.text();

            // Extract the title of the page
            const titleMatch = html.match(/<title>(.*?)<\/title>/);
            let encodedName = '';
            if (titleMatch) {
                document.querySelector('.name').textContent = titleMatch[1];
                document.title = titleMatch[1];
                encodedName = encodeURIComponent(titleMatch[1]);
                // console.log("Page title:", encodedName);
            } else {
                console.log("Title not found.");
            }

            // Extract the HLS link
            const hlsRegex = /https?:\/\/[^\s"]+\.m3u8[^\s"]*/;
            const hlsLink = html.match(hlsRegex);
            let encodedHls = '';
            if (hlsLink) {
                encodedHls = encodeURIComponent(hlsLink[0]);
                // console.log("HLS link found:", encodedHls);
            } else {
                console.log("HLS link not found.");
            }

            // Create the download URL after obtaining the data
            if (encodedName && encodedHls) {
                const downloadUrl = `https://fazhzcezbdi.showvid.ws/x-px/video-download?m=${encodedHls}&name=${encodedName}`;
                const downloadLink = document.getElementById('downloadLink');
                downloadLink.href = downloadUrl; // Update the download link
                downloadLink.style.display = 'block'; // Show the download link
                // console.log("Download URL:", downloadUrl);
            }
        } else {
            console.log("Iframe URL not found.");
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}