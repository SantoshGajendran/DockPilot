import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HeatTileComponent, HeatTileData } from './heat-tile.component';

describe('HeatTileComponent', () => {
  let component: HeatTileComponent;
  let fixture: ComponentFixture<HeatTileComponent>;

  const mockData: HeatTileData = {
    id: 'cnt-1',
    name: 'web-nginx',
    status: 'running',
    cpuPercent: 45,
    memoryUsageMb: 128
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeatTileComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(HeatTileComponent);
    component = fixture.componentInstance;
    component.item = mockData;
    fixture.detectChanges();
  });

  it('should render heat tile and map load color', () => {
    expect(component).toBeTruthy();
    expect(component.tileColor).toBe('#8B5CF6'); // 45% -> violet
  });

  it('should reveal mini-telemetry card on hover', () => {
    component.isHovered = true;
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.mini-telemetry-card');
    expect(card).toBeTruthy();
    expect(card.querySelector('.card-name').textContent.trim()).toBe('web-nginx');
  });
});

describe('HeatTileGridComponent', () => {
  it('should render tiles in grid', async () => {
    const { HeatTileGridComponent } = await import('./heat-tile.component');
    await TestBed.configureTestingModule({
      imports: [HeatTileGridComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    const gridFixture = TestBed.createComponent(HeatTileGridComponent);
    const gridComponent = gridFixture.componentInstance;
    gridComponent.tiles = [
      { id: '1', name: 'srv-1', status: 'running', cpuPercent: 10, memoryUsageMb: 100 },
      { id: '2', name: 'srv-2', status: 'stopped', cpuPercent: 0, memoryUsageMb: 0 }
    ];
    gridFixture.detectChanges();

    const tiles = gridFixture.nativeElement.querySelectorAll('dp-heat-tile');
    expect(tiles.length).toBe(2);
  });
});
