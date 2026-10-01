import { useEffect, useRef } from 'react';

let chartModulePromise = null;
function loadChartJs() {
    if (!chartModulePromise) {
        chartModulePromise = import('chart.js').then(({ Chart, registerables }) => {
            Chart.register(...registerables);
            return Chart;
        });
    }
    return chartModulePromise;
}

/**
 * Chart.js canvas. `config` is rebuilt by the caller on data changes; the chart is updated in place.
 * `redrawKey` forces a full re-create (e.g. the revenue interval buttons).
 */
export default function ChartCanvas({ id, config, redrawKey }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const configRef = useRef(config);
    configRef.current = config;

    useEffect(() => {
        let cancelled = false;
        loadChartJs().then(Chart => {
            if (cancelled || !canvasRef.current) return;
            chartRef.current?.destroy();
            chartRef.current = new Chart(canvasRef.current, configRef.current);
        });
        return () => {
            cancelled = true;
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [redrawKey]);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;
        chart.data.labels = config.data.labels;
        config.data.datasets.forEach((dataset, i) => {
            if (chart.data.datasets[i]) chart.data.datasets[i].data = dataset.data;
        });
        chart.update();
    }, [config]);

    return <canvas id={id} ref={canvasRef} />;
}
