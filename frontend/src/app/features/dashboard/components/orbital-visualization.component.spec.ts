import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrbitalVisualizationComponent, OrbitalNode } from './orbital-visualization.component';

describe('OrbitalVisualizationComponent', () => {
  let fixture: ComponentFixture<OrbitalVisualizationComponent>;
  let component: OrbitalVisualizationComponent;

  const mockNodes: OrbitalNode[] = [
    { id: 'c1', name: 'api-service', cpuPercent: 24, memoryBytes: 256000000, status: 'running' },
    { id: 'c2', name: 'db-cluster', cpuPercent: 88, memoryBytes: 1024000000, status: 'critical' },
    { id: 'c3', name: 'cache-redis', cpuPercent: 5, memoryBytes: 64000000, status: 'running' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrbitalVisualizationComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(OrbitalVisualizationComponent);
    component = fixture.componentInstance;
    component.hostCpu = 42.5;
    component.nodes = mockNodes;
    fixture.detectChanges();
  });

  it('should create orbital visualization component', () => {
    expect(component).toBeTruthy();
  });

  it('should render center host core with CPU percentage', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('.host-core-center')).toBeTruthy();
    expect(el.querySelector('.core-val').textContent).toContain('42.5% CPU');
  });

  it('should process nodes into tiered orbits with status colors', () => {
    const processed = component.processedNodes();
    expect(processed.length).toBe(3);
    expect(processed[0].orbitRadius).toBe(140);
    expect(processed[1].color).toBe('#F43F5E'); // Critical red
    expect(processed[2].color).toBe('#34D399'); // Running green
  });

  it('should show hover telemetry card on craft hover', () => {
    component.hoveredNode = component.nodes[0];
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.node-telemetry-card');
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('api-service');
  });
});
