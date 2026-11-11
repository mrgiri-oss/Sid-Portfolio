
    // ----------------------------------------------------
    // 1. Setup Custom Cursor with Magnetic & Interaction Lerp
    // ----------------------------------------------------
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorRing = document.querySelector('.cursor-ring');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let targetX = mouseX;
    let targetY = mouseY;
    let isHovered = false;
    let portraitBaseY = 0;
    let imageAspectRatio = 612.0 / 408.0;

    window.addEventListener('mousemove', (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
    });

    // Add hover classes
    const hoverTargets = document.querySelectorAll('.hover-target, a, button, .tech-icon');
    hoverTargets.forEach(el => {
        el.addEventListener('mouseenter', () => {
            isHovered = true;
            gsap.to(cursorRing, {
                width: 60,
                height: 60,
                borderColor: 'rgba(255, 45, 32, 1)',
                backgroundColor: 'rgba(255, 45, 32, 0.05)',
                duration: 0.3
            });
            gsap.to(cursorDot, { scale: 2, duration: 0.2 });
        });

        el.addEventListener('mouseleave', () => {
            isHovered = false;
            gsap.to(cursorRing, {
                width: 30,
                height: 30,
                borderColor: 'rgba(255, 45, 32, 0.4)',
                backgroundColor: 'rgba(255, 45, 32, 0)',
                duration: 0.3
            });
            gsap.to(cursorDot, { scale: 1, duration: 0.2 });
        });
    });

    // ----------------------------------------------------
    // 2. Smooth Scrolling Setup (Lenis)
    // ----------------------------------------------------
    const lenis = new Lenis({
        duration: 1.4,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
        wheelMultiplier: 1.0,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000) });
    gsap.ticker.lagSmoothing(0, 0);

    gsap.registerPlugin(ScrollTrigger);

    // ----------------------------------------------------
    // 3. WebGL Cinematic Scene
    // ----------------------------------------------------
    const canvas = document.getElementById('webgl-canvas');
    const PORTRAIT_BW_URL = new URL(
    canvas.dataset.bwImage,
        document.baseURI
    ).href;

    const PORTRAIT_COLOR_URL = new URL(
        canvas.dataset.colorImage,
        document.baseURI
    ).href;

    console.log("BW Image URL:", PORTRAIT_BW_URL);
    console.log("Colour Image URL:", PORTRAIT_COLOR_URL);

    const bgCanvas = document.getElementById('bg-canvas');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        40, window.innerWidth / window.innerHeight, 0.1, 100
    );
    camera.position.z = 5.0;

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const bgScene = new THREE.Scene();
    const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const bgRenderer = new THREE.WebGLRenderer({
        canvas: bgCanvas,
        antialias: true
    });

    bgRenderer.setSize(window.innerWidth, window.innerHeight);
    bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // ----------------------------------------------------
    // 4. Fluid Ripple Simulation Removed
    // ----------------------------------------------------

   
    // ----------------------------------------------------
    // 5. Textures Loading
    // ----------------------------------------------------

    const textureLoader = new THREE.TextureLoader();

    function handleTextureError(url) {
        console.error("Unable to load WebGL portrait:", url);
        console.error("Check the image filename and its path.");
    }

    const textureA = textureLoader.load(
        PORTRAIT_BW_URL,
        (tex) => {
            console.log("Black & white image loaded:", PORTRAIT_BW_URL);

            tex.generateMipmaps = false;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;

            portraitMaterial.uniforms.u_imageSize.value.set(
                tex.image.width,
                tex.image.height
            );

            imageAspectRatio = tex.image.width / tex.image.height;

            resize();
        },
        undefined,
        () => handleTextureError(PORTRAIT_BW_URL)
    );

    const textureB = textureLoader.load(
        PORTRAIT_COLOR_URL,
        (tex) => {
            console.log("Colour image loaded:", PORTRAIT_COLOR_URL);

            tex.generateMipmaps = false;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
        },
        undefined,
        () => handleTextureError(PORTRAIT_COLOR_URL)
    );

    console.log("WebGL renderer:", renderer);
    console.log("Texture A:", textureA);
    console.log("Texture B:", textureB);


    // ----------------------------------------------------
    // 6. Volumetric Background Shaders
    // ----------------------------------------------------
    const bgMaterial = new THREE.ShaderMaterial({
        uniforms: {
            u_time: { value: 0 },
            u_resolution: {
                value: new THREE.Vector2(window.innerWidth, window.innerHeight)
            },
            u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
            u_scroll: { value: 0.0 }
        },

        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `,

        fragmentShader: `
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec2 u_mouse;
            uniform float u_scroll;
            varying vec2 vUv;

            vec3 permute(vec3 x) {
                return mod(((x*34.0)+1.0)*x, 289.0);
            }

            float snoise(vec2 v) {
                const vec4 C = vec4(
                    0.211324865405187,
                    0.366025403784439,
                    -0.577350269189626,
                    0.024390243902439
                );

                vec2 i = floor(v + dot(v, C.yy));
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y)
                    ? vec2(1.0, 0.0)
                    : vec2(0.0, 1.0);

                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod(i, 289.0);

                vec3 p = permute(
                    permute(i.y + vec3(0.0, i1.y, 1.0))
                    + i.x + vec3(0.0, i1.x, 1.0)
                );

                vec3 m = max(
                    0.5 - vec3(
                        dot(x0, x0),
                        dot(x12.xy, x12.xy),
                        dot(x12.zw, x12.zw)
                    ), 0.0
                );

                m = m*m;
                m = m*m;

                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;

                m *= 1.79284291400159 -
                    0.85373472095314 * (a0*a0 + h*h);

                vec3 g;
                g.x = a0.x * x0.x + h.x * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;

                return 130.0 * dot(m, g);
            }

            void main() {
                vec2 uv = vUv;

                vec2 c = vec2(0.5, 0.5);
                float dist = length(uv - c);

                vec3 col = mix(
                    vec3(0.97, 0.97, 0.98),
                    vec3(0.93, 0.93, 0.95),
                    dist
                );

                vec2 lightPos = u_mouse / u_resolution;
                float lightDist = length(uv - lightPos);

                vec3 spotlight = vec3(1.0, 0.3, 0.25) *
                    (1.0 - smoothstep(0.0, 0.7, lightDist)) * 0.025;

                col += spotlight;

                float fog = snoise(
                    uv * 1.5 + vec2(u_time * 0.03, u_time * 0.02)
                ) * 0.5 + 0.5;

                float fog2 = snoise(
                    uv * 2.8 - vec2(u_time * 0.04, -u_time * 0.035)
                ) * 0.5 + 0.5;

                float combinedFog = mix(fog, fog2, 0.5);

                vec3 fogColor = vec3(0.92, 0.92, 0.94) *
                    combinedFog * 0.035;

                col += fogColor;

                vec2 raySrc = vec2(0.2, 0.95);
                vec2 diff = uv - raySrc;
                float rayAngle = atan(diff.y, diff.x);

                float rayNoise = snoise(
                    vec2(rayAngle * 4.0, u_time * 0.08)
                ) * 0.5 + 0.5;

                float rayFalloff = smoothstep(1.6, 0.0, length(diff));

                col += vec3(1.0, 0.98, 0.95) *
                    rayNoise * rayFalloff * 0.008;

                float grain = fract(
                    sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453
                );

                col += (grain - 0.5) * 0.012;

                float scrollFade = clamp(u_scroll / 600.0, 0.0, 1.0);
                col = mix(col, vec3(1.0), scrollFade);

                gl_FragColor = vec4(col, 1.0);
            }
        `
    });

    const bgMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        bgMaterial
    );

    bgScene.add(bgMesh);


    // ----------------------------------------------------
    // 7. Interactive Portrait Mesh Material
    // ----------------------------------------------------
    const portraitMaterial = new THREE.ShaderMaterial({
        uniforms: {
            u_textureA: { value: textureA },
            u_textureB: { value: textureB },
            u_time: { value: 0 },
            u_mouseMeshUv: { value: new THREE.Vector2(0.5, 0.5) },
            u_hoverStrength: { value: 0.0 },
            u_resolution: {
                value: new THREE.Vector2(window.innerWidth, window.innerHeight)
            },
            u_imageSize: { value: new THREE.Vector2(1000, 1333) },
            u_planeSize: { value: new THREE.Vector2(1, 1) },
            u_revealRadius: { value: 0.35 },
            u_scroll: { value: 0 },
            u_tilt: { value: new THREE.Vector2() },
            u_textureBOffset: { value: new THREE.Vector2(0.0, 0.0) }
        },

        vertexShader: `
            varying vec2 vUv;
            varying vec3 vViewPosition;

            void main() {
                vUv = uv;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = -mvPosition.xyz;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,

        fragmentShader: `
            uniform sampler2D u_textureA;
            uniform sampler2D u_textureB;
            uniform float u_time;
            uniform vec2 u_mouseMeshUv;
            uniform float u_hoverStrength;
            uniform vec2 u_resolution;
            uniform vec2 u_imageSize;
            uniform vec2 u_planeSize;
            uniform float u_revealRadius;
            uniform float u_scroll;
            uniform vec2 u_textureBOffset;

            varying vec2 vUv;
            varying vec3 vViewPosition;

            vec2 getCoverUV(vec2 uv, vec2 imgSize, vec2 planeSize) {
                float imgAspect = imgSize.x / imgSize.y;
                float planeAspect = planeSize.x / planeSize.y;

                vec2 scale = vec2(1.0);

                if (planeAspect > imgAspect) {
                    scale.y = imgAspect / planeAspect;
                } else {
                    scale.x = planeAspect / imgAspect;
                }

                return (uv - 0.5) * scale + 0.5;
            }

            void main() {
                vec2 coverUv = getCoverUV(vUv, u_imageSize, u_planeSize);

                vec4 texColA = texture2D(u_textureA, coverUv);
                vec3 colA = texColA.rgb;

                vec2 coverUvB = coverUv + u_textureBOffset;
                vec4 texColB = texture2D(u_textureB, coverUvB);
                vec3 colB = texColB.rgb;

                vec2 diff = (vUv - u_mouseMeshUv) * u_planeSize;
                float dist = length(diff);

                float radius = u_revealRadius;

                float revealMask = (
                    1.0 - smoothstep(radius - 0.08, radius, dist)
                ) * u_hoverStrength;

                vec3 finalColor = mix(colA, colB, revealMask);
                float finalAlpha = mix(
                    texColA.a, texColB.a, revealMask
                );

                float fadeFactor = 1.0 -
                    clamp((u_scroll - 200.0) / 400.0, 0.0, 1.0);

                gl_FragColor = vec4(
                    finalColor,
                    finalAlpha * fadeFactor
                );
            }
        `,

        transparent: true,
        depthWrite: false
    });

    // 3D Plane Mesh for Portrait
    const portraitGeometry = new THREE.PlaneGeometry(1, 1, 32, 32);
    const portraitMesh = new THREE.Mesh(
        portraitGeometry,
        portraitMaterial
    );

    scene.add(portraitMesh);

    // ----------------------------------------------------
    // 8. Dynamic 3D Particle System
    // ----------------------------------------------------
    const particleCount = window.innerWidth < 768 ? 60 : 150;

    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const initialPartData = [];

    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 5.0;
        const y = (Math.random() - 0.5) * 3.5;
        const z = (Math.random() - 0.5) * 2.0 - 0.5;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        initialPartData.push({
            x, y, z,
            speedX: (Math.random() - 0.5) * 0.015,
            speedY: (Math.random() - 0.5) * 0.015,
            speedZ: (Math.random() - 0.5) * 0.008,
            amp: Math.random() * 0.08 + 0.02,
            freq: Math.random() * 0.4 + 0.1,
            phase: Math.random() * Math.PI * 2
        });
    }

    particleGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
    );

    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            u_time: { value: 0 },
            u_mouse3D: { value: new THREE.Vector3() },
            u_scroll: { value: 0 }
        },

        vertexShader: `
            uniform float u_time;
            uniform vec3 u_mouse3D;
            varying float vAlpha;

            void main() {
                vec3 pos = position;

                float d = distance(pos, u_mouse3D);

                if (d < 2.0) {
                    float pull = (1.0 - (d / 2.0)) * 0.16;
                    pos = mix(pos, u_mouse3D, pull);
                }

                vAlpha = smoothstep(-2.5, 0.5, pos.z) * 0.65;

                vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

                gl_PointSize = (12.0 / -mvPos.z) *
                    (1.0 + sin(u_time * 2.5 + pos.x) * 0.2);

                gl_Position = projectionMatrix * mvPos;
            }
        `,

        fragmentShader: `
            varying float vAlpha;

            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));

                if (dist > 0.5) discard;

                float glow = smoothstep(0.5, 0.0, dist);

                vec3 col = mix(
                    vec3(0.08, 0.08, 0.12),
                    vec3(0.85, 0.15, 0.1),
                    gl_PointCoord.y
                );

                gl_FragColor = vec4(col, glow * vAlpha * 1.5);
            }
        `,

        transparent: true,
        depthWrite: false
    });

    const particles = new THREE.Points(
        particleGeometry,
        particleMaterial
    );

    scene.add(particles);

    const raycaster = new THREE.Raycaster();
    const mousePlane = new THREE.Plane(
        new THREE.Vector3(0, 0, 1), 0
    );

    const mouse3D = new THREE.Vector3();

    // ----------------------------------------------------
    // 9. Window Resize & Cover Calculations
    // ----------------------------------------------------
    function resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        renderer.setSize(width, height);

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        bgRenderer.setSize(width, height);

        bgMaterial.uniforms.u_resolution.value.set(width, height);

        const vFOV = camera.fov * Math.PI / 180;
        const visibleHeight = 2.0 *
            Math.tan(vFOV / 2.0) * camera.position.z;

        const visibleWidth = visibleHeight * camera.aspect;

        const imgAspect = imageAspectRatio;
        const targetHeight = visibleHeight * 0.76;
        const targetWidth = targetHeight * imgAspect;

        if (visibleWidth * 0.95 < targetWidth) {
            const mobileWidth = visibleWidth * 0.9;

            portraitMesh.scale.set(
                mobileWidth,
                mobileWidth / imgAspect,
                1.0
            );
        } else {
            portraitMesh.scale.set(targetWidth, targetHeight, 1.0);
        }

        portraitBaseY = -visibleHeight / 2.0 +
            portraitMesh.scale.y / 2.0;

        portraitMesh.position.y = portraitBaseY;

        portraitMaterial.uniforms.u_planeSize.value.set(
            portraitMesh.scale.x,
            portraitMesh.scale.y
        );

        portraitMaterial.uniforms.u_resolution.value.set(width, height);
    }

    window.addEventListener('resize', resize);
    resize();

    // ----------------------------------------------------
    // 10. WebGL Unified Rendering & Animation Loop
    // ----------------------------------------------------
    const clock = new THREE.Clock();

    let prevX = -1;
    let prevY = -1;

    let uvMouse = new THREE.Vector2(-1, -1);
    let speed = 0;
    let targetSpeed = 0;

    let meshTargetRotX = 0;
    let meshTargetRotY = 0;

    function animate() {
        requestAnimationFrame(animate);

        const time = clock.getElapsedTime();
        const scrollY = window.scrollY;

        mouseX = targetX;
        mouseY = targetY;

        ringX += (targetX - ringX) * 0.12;
        ringY += (targetY - ringY) * 0.12;

        cursorDot.style.left = mouseX + 'px';
        cursorDot.style.top = mouseY + 'px';

        cursorRing.style.left = ringX + 'px';
        cursorRing.style.top = ringY + 'px';

        if (prevX >= 0 && prevY >= 0) {
            const dist = Math.sqrt(
                Math.pow(targetX - prevX, 2) +
                Math.pow(targetY - prevY, 2)
            );

            targetSpeed = Math.min(dist * 0.06, 1.5);
        }

        prevX = targetX;
        prevY = targetY;

        speed += (targetSpeed - speed) * 0.1;
        targetSpeed *= 0.85;

        uvMouse.set(
            targetX / window.innerWidth,
            targetY / window.innerHeight
        );

        portraitMaterial.uniforms.u_time.value = time;
        portraitMaterial.uniforms.u_scroll.value = scrollY;

        portraitMesh.position.y = portraitBaseY;
        portraitMesh.position.x = 0;

        portraitMesh.rotation.set(0, 0, 0);

        raycaster.setFromCamera(
            new THREE.Vector2(
                (targetX / window.innerWidth) * 2.0 - 1.0,
                -(targetY / window.innerHeight) * 2.0 + 1.0
            ),
            camera
        );

        raycaster.ray.intersectPlane(mousePlane, mouse3D);

        particleMaterial.uniforms.u_mouse3D.value.copy(mouse3D);
        particleMaterial.uniforms.u_time.value = time;

        const intersects = raycaster.intersectObject(portraitMesh);

        let targetHoverStrength = 0.0;

        if (intersects.length > 0) {
            targetHoverStrength = 1.0;

            const uv = intersects[0].uv;

            portraitMaterial.uniforms.u_mouseMeshUv.value.x +=
                (uv.x - portraitMaterial.uniforms.u_mouseMeshUv.value.x) * 0.12;

            portraitMaterial.uniforms.u_mouseMeshUv.value.y +=
                (uv.y - portraitMaterial.uniforms.u_mouseMeshUv.value.y) * 0.12;
        }

        portraitMaterial.uniforms.u_hoverStrength.value +=
            (targetHoverStrength -
            portraitMaterial.uniforms.u_hoverStrength.value) * 0.08;

        const pPositions = particleGeometry.attributes.position.array;

        for (let i = 0; i < particleCount; i++) {
            const data = initialPartData[i];

            const wave = Math.sin(
                time * data.freq + data.phase
            ) * data.amp;

            pPositions[i * 3] = data.x + wave * 0.6;
            pPositions[i * 3 + 1] = data.y + wave;

            data.z += data.speedZ;

            if (data.z > 1.5) data.z = -2.5;

            pPositions[i * 3 + 2] = data.z;
        }

        particleGeometry.attributes.position.needsUpdate = true;

        bgMaterial.uniforms.u_time.value = time;
        bgMaterial.uniforms.u_mouse.value.set(mouseX, mouseY);
        bgMaterial.uniforms.u_scroll.value = scrollY;

        bgRenderer.render(bgScene, bgCamera);
        renderer.render(scene, camera);
    }

    animate();


    // ----------------------------------------------------
    // 11. GSAP Scroll Trigger Animations
    // ----------------------------------------------------

    // Typography letter splitting
    const splitText = new SplitType(
        '.hero-name-heading span',
        { types: 'chars' }
    );

    // Animate typography letter entry on page load
    gsap.from('.hero-name-heading .char', {
        y: "100%",
        opacity: 0,
        duration: 1.2,
        stagger: 0.03,
        ease: "power4.out",
        delay: 0.4,
        clearProps: "transform,opacity"
    });

    // Typography break apart scroll parallax
    gsap.to('.hero-name-heading .outline', {
        x: -120,
        scrollTrigger: {
            trigger: '.hero-section',
            start: 'top top',
            end: 'bottom top',
            scrub: true
        }
    });

    gsap.to('.hero-name-heading .fill', {
        x: 120,
        scrollTrigger: {
            trigger: '.hero-section',
            start: 'top top',
            end: 'bottom top',
            scrub: true
        }
    });

    // Fade typography on scroll out
    gsap.to('.hero-name-heading', {
        opacity: 0,
        scale: 0.9,
        scrollTrigger: {
            trigger: '.hero-section',
            start: 'top top',
            end: '60% top',
            scrub: true
        }
    });

    // Fade in UI cards and header elements
    gsap.from('.hero-info-card', {
        x: -40,
        opacity: 0,
        duration: 1.2,
        ease: "power3.out",
        delay: 0.8
    });

    gsap.from('.hero-social-pills', {
        x: 40,
        opacity: 0,
        duration: 1.2,
        ease: "power3.out",
        delay: 0.8
    });

    gsap.from('.nav-container', {
        y: -20,
        opacity: 0,
        duration: 1.0,
        ease: "power3.out",
        delay: 0.2
    });

    // ----------------------------------------------------
    // 13. Page Content Scroll Interactions
    // ----------------------------------------------------

    // Manifesto revealing words
    const manifestoSplit = new SplitType(
        '.manifesto-text',
        { types: 'words' }
    );

    gsap.from(manifestoSplit.words, {
        opacity: 0.12,
        stagger: 0.08,
        scrollTrigger: {
            trigger: ".manifesto-sec",
            start: "top 75%",
            end: "center center",
            scrub: 1
        }
    });

    manifestoSplit.words.forEach(word => {
        gsap.to(word, {
            color: '#ffffff',
            scrollTrigger: {
                trigger: word,
                start: "top 72%",
                end: "top 50%",
                scrub: true
            }
        });
    });

    // About section slide trigger
    gsap.fromTo(
        '.about-portrait',
        { scale: 1.15 },
        {
            scale: 1,
            scrollTrigger: {
                trigger: ".about-sec",
                start: "top bottom",
                end: "top top",
                scrub: true
            }
        }
    );

    // Projects Stack pin trigger
    const projects = gsap.utils.toArray('.project-panel');

    projects.forEach((panel) => {
        ScrollTrigger.create({
            trigger: panel,
            start: "top top",
            pin: true,
            pinSpacing: false
        });

        const img = panel.querySelector('.project-mockup img');

        gsap.fromTo(
            img,
            { scale: 1.22, opacity: 0.5 },
            {
                scale: 1,
                opacity: 0.95,
                scrollTrigger: {
                    trigger: panel,
                    start: "top bottom",
                    end: "top top",
                    scrub: true
                }
            }
        );
    });

    // Dynamic stats calculations
    const stats = document.querySelectorAll('.num-val');

    stats.forEach(stat => {
        gsap.to(stat, {
            scrollTrigger: {
                trigger: stat,
                start: "top 80%"
            },
            innerHTML: stat.getAttribute('data-target'),
            duration: 2.2,
            snap: { innerHTML: 1 },
            ease: "power2.out"
        });
    });

    // Reveal standard headlines
    const reveals = document.querySelectorAll('.reveal-text');

    reveals.forEach(el => {
        const split = new SplitType(
            el,
            { types: 'words, chars' }
        );

        gsap.from(split.chars, {
            opacity: 0,
            y: 40,
            rotateX: -40,
            stagger: 0.025,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
            }
        });
    });

    // ----------------------------------------------------
    // 14. Image Alignment Controls
    // ----------------------------------------------------
    let offsetX = -1.0 / 612.0;
    let offsetY = -4.0 / 408.0;

    portraitMaterial.uniforms.u_textureBOffset.value.set(
        offsetX,
        offsetY
    );

    window.addEventListener('keydown', (e) => {
        const step = 1.0 / 612.0;

        if (e.key === 'ArrowLeft') {
            offsetX -= step;
        } else if (e.key === 'ArrowRight') {
            offsetX += step;
        } else if (e.key === 'ArrowUp') {
            offsetY += step;
        } else if (e.key === 'ArrowDown') {
            offsetY -= step;
        } else {
            return;
        }

        portraitMaterial.uniforms.u_textureBOffset.value.set(
            offsetX,
            offsetY
        );

        console.log(
            `Texture B Offset: dx = ${(offsetX * 612.0).toFixed(2)}px, ` +
            `dy = ${(-offsetY * 408.0).toFixed(2)}px ` +
            `(offsetX = ${offsetX.toFixed(6)}, offsetY = ${offsetY.toFixed(6)})`
        );
    });
