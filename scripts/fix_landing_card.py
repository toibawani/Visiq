#!/usr/bin/env python3
"""Fix the featured fluid card in index.html - remove hardcoded inline styles."""
import re

path = '/Users/apple/.cline/worktrees/430bf/Visiq/index.html'
with open(path, 'r') as f:
    content = f.read()

# Replace the inline-styled feature card with a class-based version
old_block = '''<section style="padding: 0 20px 32px; max-width: 900px; margin: 0 auto;" aria-label="Featured simulation">
    <a href="fluid.html" style="display:block; background: linear-gradient(135deg, rgba(0,229,255,0.05) 0%, rgba(12,15,23,0.95) 100%); border: 1px solid rgba(0,229,255,0.22); border-radius: var(--radius-lg); padding: 24px 28px; text-decoration: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); cursor: pointer;" onmouseover="this.style.borderColor='rgba(0,229,255,0.5)'; this.style.boxShadow='0 0 20px rgba(0,229,255,0.15)'" onmouseout="this.style.borderColor='rgba(0,229,255,0.22)'; this.style.boxShadow='none'">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <span style="background: rgba(0,229,255,0.12); color:var(--accent-physics); border: 1px solid rgba(0,229,255,0.3); border-radius:var(--radius-pill); font-size:0.7rem; font-weight:600; padding:3px 10px; letter-spacing:0.08em; text-transform:uppercase; font-family:var(--font-mono);">✦ Signature Instrument</span>
            <span style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted);">NAVIER-STOKES · WORKER 60 FPS</span>
        </div>
        <h2 style="font-family:var(--font-display); font-size:1.5rem; font-weight:700; color:var(--text-primary); margin:0 0 8px; letter-spacing:-0.02em;">Fluid Dynamics — Navier-Stokes Stable Fluids</h2>
        <p style="font-size:0.9rem; color:var(--text-secondary); margin:0 0 16px; line-height:1.65;">Drag to inject vorticity, buoyant smoke, and momentum fields into a real-time Eulerian grid. Engineered from Jos Stam's stable fluids algorithm — identical mathematics to meteorological models and aerodynamic wind tunnels.</p>
        <span style="display:inline-flex; align-items:center; gap:6px; color:var(--accent-physics); font-size:0.85rem; font-weight:600; font-family:var(--font-mono); letter-spacing:0.04em;">Launch instrument module →</span>
    </a>
</section>'''

new_block = '''<section class="featured-fluid-card" aria-label="Featured simulation">
    <a href="fluid.html" class="featured-fluid-link">
        <div class="featured-fluid-header">
            <span class="featured-fluid-tag">Signature Instrument</span>
            <span class="featured-fluid-tag-secondary">NAVIER-STOKES · WORKER 60 FPS</span>
        </div>
        <h2 class="featured-fluid-title">Fluid Dynamics — Navier-Stokes Stable Fluids</h2>
        <p class="featured-fluid-description">Drag to inject vorticity, buoyant smoke, and momentum fields into a real-time Eulerian grid. Engineered from Jos Stam's stable fluids algorithm — identical mathematics to meteorological models and aerodynamic wind tunnels.</p>
        <span class="featured-fluid-launch">Launch instrument module →</span>
    </a>
</section>'''

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(path, 'w') as f:
        f.write(content)
    print("Successfully replaced featured fluid card")
else:
    print("ERROR: Old block not found!")
    print("Looking for:", old_block[:100])
