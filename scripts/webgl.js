import * as THREE from 'three';

// Optional renderer. The complete CSS scene remains active if WebGL is
// unavailable or the context is lost; there are no remote dependencies.
(async function install() {
  let renderer;
  const canvas = document.createElement('canvas');
  canvas.id = 'webgl-scene';
  canvas.setAttribute('aria-label', '庭院纵深场景');
  try {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) return;
    renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
  } catch { return; }
  document.body.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, innerWidth / innerHeight, .1, 500);
  camera.position.set(0, 0, 28);
  const paperColor = new THREE.Color('#d9c8a5');
  scene.background = paperColor;
  const stage = document.getElementById('stage');
  const frame = { w: 1, h: 1 };
  const sceneItems = [];
  const common = {
    zoomView: { value: 1 }, pivotRaw: { value: new THREE.Vector2() },
    pivotTarget: { value: new THREE.Vector2() }, pan: { value: new THREE.Vector2() },
    roll: { value: 0 }, pitch: { value: 0 }, paperColor: { value: paperColor },
  };
  const vertex = `varying vec2 vUv;varying float vDistance;
    uniform vec2 anchorShift,pivotRaw,pivotTarget,pan;uniform float zoomView,roll,pitch;
    void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.);
      vDistance=distance(cameraPosition,world.xyz);
      vec4 p=projectionMatrix*viewMatrix*world;
      vec2 q=p.xy/p.w+anchorShift-pivotRaw;
      q*=zoomView;float c=cos(roll),s=sin(roll);
      q=mat2(c,-s,s,c)*q;q.y*=cos(pitch);
      p.xy=(q+pivotTarget+pan)*p.w;gl_Position=p;
    }`;
  const spriteFragment = `uniform sampler2D map;uniform vec3 paperColor;
    uniform float nearFade,farFade,maxFade,alphaCutoff;
    varying vec2 vUv;varying float vDistance;
    void main(){vec4 c=texture2D(map,vUv);if(c.a<alphaCutoff)discard;
      float dissolve=smoothstep(nearFade,farFade,vDistance)*maxFade;
      gl_FragColor=vec4(mix(c.rgb,paperColor,dissolve),c.a);
      #include <colorspace_fragment>
    }`;
  const source = document.getElementById('reference-picture').getAttribute('href');
  const cleanSource = document.getElementById('clean-picture').getAttribute('href');
  const loader = new THREE.TextureLoader();
  async function texture(url) {
    const t = await loader.loadAsync(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  const [reference, clean] = await Promise.all([texture(source), texture(cleanSource)]);
  function uniforms(extra = {}) {
    return { ...common, anchorShift: { value: new THREE.Vector2() }, ...extra };
  }
  const backgroundFragment = `uniform sampler2D map,clean;varying vec2 vUv;
    float box(vec2 p,vec4 b){return step(b.x,p.x)*step(b.y,p.y)*step(p.x,b.z)*step(p.y,b.w);}
    void main(){vec2 p=vec2(vUv.x*1538.,(1.-vUv.y)*954.);
      float m=box(p,vec4(883.,180.,922.,669.));
      m=max(m,smoothstep(977.,991.,p.x)*(1.-smoothstep(706.,720.,p.y)));
      m=max(m,box(p,vec4(0.,878.,74.,954.)));
      m=max(m,box(p,vec4(1370.,795.,1538.,954.)));m=max(m,box(p,vec4(1250.,938.,1538.,954.)));
      gl_FragColor=mix(texture2D(map,vUv),texture2D(clean,vUv),m);
      #include <colorspace_fragment>
    }`;
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: backgroundFragment,
    uniforms: uniforms({ map: { value: reference }, clean: { value: clean } }), depthWrite: false,
  }));
  bg.position.z = -40;bg.renderOrder = -100;scene.add(bg);
  const archFragment = `uniform sampler2D map;varying vec2 vUv;
    void main(){vec2 p=vec2(vUv.x*1538.,(1.-vUv.y)*954.);
      float edge=p.y<640.?985.:(p.y<675.?mix(984.,1003.,(p.y-640.)/35.):mix(1003.,1000.,(p.y-675.)/25.));
      bool inRoom=p.x<edge&&p.y<700.;
      // The opening stops at the actual column silhouette, not at its red face.
      // Keep in sync with the column-door aperture in build.py (source pixels).
      float gapRight=p.y<530.?909.:(p.y<642.?mix(909.,908.,(p.y-530.)/112.):mix(908.,900.,(p.y-642.)/13.));
      bool gap=p.y>224.&&p.y<655.&&p.x>886.&&p.x<gapRight;
      if(!inRoom||gap)discard;gl_FragColor=texture2D(map,vUv);
      #include <colorspace_fragment>
    }`;
  const architecture = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: archFragment,
    uniforms: uniforms({ map: { value: reference } }), transparent: true, depthWrite: false,
  }));
  architecture.position.z = -40;architecture.renderOrder = 40;scene.add(architecture);
  // High-resolution column is a separate alpha cutout. Its registered silhouette
  // stays inside the existing foreground occluder; all plant motion is unchanged.
  const columnTexture = await texture(document.getElementById('column-picture').getAttribute('href'));
  const columnFragment = `uniform sampler2D map;varying vec2 vUv;
    void main(){vec2 p=vec2(vUv.x*1538.,(1.-vUv.y)*954.);
      if(p.y<0.||p.y>=700.)discard;
      float leftEdge=p.y<224.?916.:(p.y<530.?909.:(p.y<642.?mix(909.,908.,(p.y-530.)/112.):(p.y<655.?mix(908.,900.,(p.y-642.)/13.):(p.y<675.?mix(900.,896.,(p.y-655.)/20.):896.))));
      float rightEdge=p.y<640.?985.:(p.y<675.?mix(985.,1003.,(p.y-640.)/35.):mix(1003.,1000.,(p.y-675.)/25.));
      if(p.x<leftEdge||p.x>rightEdge)discard;
      float sourceY=p.y<520.?p.y*1010./520.:(p.y<654.?1010.+(p.y-520.)*360./134.:1370.+(p.y-654.)*119./46.);
      vec4 color=texture2D(map,vec2((p.x-877.)/142.,1.-sourceY/1493.));
      if(color.a<.035)discard;gl_FragColor=color;
      #include <colorspace_fragment>
    }`;
  const column = new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({
    vertexShader:vertex,fragmentShader:columnFragment,uniforms:uniforms({map:{value:columnTexture}}),
    transparent:true,alphaTest:.035,depthWrite:false,
  }));
  column.position.z=-40;column.renderOrder=41;column.name='red-column';scene.add(column);
  for (const el of document.querySelectorAll('.plant')) {
    const key = el.getAttribute('data-key');
    const t = await texture(el.querySelector('img').src);
    const origin = el.style.transformOrigin.split(' ').map(parseFloat);
    const cx = origin[0] / 100, ground = parseFloat(el.style.getPropertyValue('--ground')) / 100;
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.translate(.5 - cx, ground - .5, 0);
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex, fragmentShader: spriteFragment,
      uniforms: uniforms({ map: { value: t }, nearFade: { value: 90 }, farFade: { value: 360 },
        maxFade: { value: .7 }, alphaCutoff: { value: .035 } }),
      transparent: true, alphaTest: .035, depthWrite: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const isFence = key === 'railing';
    const isDistant = key === 'far-fence';
    const depth = Number(el.getAttribute('data-depth'));
    mesh.position.z = isFence ? -35 : isDistant ? -100 : -135 + depth * 130;
    mesh.renderOrder = isFence ? 30 : isDistant ? 22 : 10;
    mesh.name = key;scene.add(mesh);
    sceneItems.push({ mesh, key, cx: Number(el.getAttribute('data-x')),
      baseline: Number(el.getAttribute('data-base')), width: Number(el.getAttribute('data-width')),
      aspect: t.image.width / t.image.height });
  }
  function resize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    camera.aspect = innerWidth / innerHeight;camera.updateProjectionMatrix();
    const unitsPerPixel = 2 * 68 * Math.tan(THREE.MathUtils.degToRad(13)) / innerHeight;
    frame.w = stage.offsetWidth * unitsPerPixel;
    frame.h = stage.offsetHeight * unitsPerPixel;
    bg.scale.set(frame.w, frame.h, 1);architecture.scale.copy(bg.scale);column.scale.copy(bg.scale);
  }
  resize();addEventListener('resize', resize);
  const point = new THREE.Vector3(), support = new THREE.Vector3();
  const pivot = new THREE.Vector3();
  window.__renderThree = function(state) {
    const progress = Math.max(0, Math.min(1, (state.zoom - 1) / 1.4));
    camera.position.z = 28 - progress * 2;
    camera.updateMatrixWorld();
    const baseDistance = camera.position.z + 40;
    common.zoomView.value = state.zoom * baseDistance / 68;
    pivot.set((state.focus.x-.5)*frame.w, (.5-state.focus.y)*frame.h, -40).project(camera);
    common.pivotRaw.value.set(pivot.x, pivot.y);
    common.pivotTarget.value.set((state.focus.x-.5)*stage.offsetWidth*2/innerWidth,
      (.5-state.focus.y)*stage.offsetHeight*2/innerHeight);
    common.pan.value.set(state.pixelX*2/innerWidth, -state.pixelY*2/innerHeight);
    common.roll.value = THREE.MathUtils.degToRad(state.roll);
    common.pitch.value = THREE.MathUtils.degToRad(state.pitch);
    for (const item of sceneItems) {
      const { mesh, key, cx, baseline, width, aspect } = item;
      const motion = state.motion[key] || { shift: 0, lean: 0, grow: 1, sway: 0 };
      const ratio = (28-mesh.position.z)/68;
      const w = width * frame.w * ratio;
      mesh.scale.set(w*motion.grow, w/aspect*motion.grow, 1);
      mesh.position.x = (cx-.5)*frame.w*ratio;
      mesh.position.y = (.5-baseline)*frame.h*ratio;
      mesh.rotation.z = THREE.MathUtils.degToRad(motion.lean);
      mesh.rotation.y = THREE.MathUtils.degToRad(motion.sway || 0);
      mesh.updateMatrixWorld();
      point.copy(mesh.position).project(camera);
      support.set((cx-.5)*frame.w+motion.shift/stage.offsetWidth*frame.w,
        (.5-baseline)*frame.h, -40).project(camera);
      mesh.material.uniforms.anchorShift.value.set(support.x-point.x,support.y-point.y);
    }
    renderer.render(scene,camera);
    document.body.classList.add('render-3d');
    window.__threeReady = true;
    window.__threeDebug = { fov: camera.fov, fog: scene.fog, cameraZ: camera.position.z,
      layers: sceneItems.map(i => i.key), maxDissolve: .7, transparent: true, columnCutout: {width:columnTexture.image.width,height:columnTexture.image.height,renderOrder:column.renderOrder} };
  };
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();document.body.classList.remove('render-3d');window.__renderThree=null;
    window.__threeReady=false;
  });
})().catch(error => { console.warn('Using the offline compatible scene:', error.message); });
