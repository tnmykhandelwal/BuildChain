document.addEventListener("DOMContentLoaded", function() {
    
    // 1. SLIDESHOW LOGIC
    let slideIndex = 0;
    const slides = document.querySelectorAll(".slide");

    if (slides.length > 0) {
        function showSlides() {
            slides.forEach(slide => slide.style.display = "none");
            slideIndex++;
            if (slideIndex > slides.length) { slideIndex = 1 }
            slides[slideIndex - 1].style.display = "block";
            setTimeout(showSlides, 4000); 
        }
        showSlides();
    }

    // 2. TYPEWRITER EFFECT
    const text = "Trust in every brick. Transparency in every byte.";
    const typeTarget = document.getElementById("typewriter");
    let i = 0;

    function typeWriter() {
        if (i < text.length) {
            typeTarget.innerHTML += text.charAt(i);
            i++;
            setTimeout(typeWriter, 80); // Typing speed
        } else {
            // Blink effect continues via CSS
        }
    }
    
    // Start typing after 1 second
    setTimeout(typeWriter, 1000);
});