
import React, { FC } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { TimelineDataPoint } from '../../types';

interface TimelineChartProps {
  data: TimelineDataPoint[];
  color?: string;
  title: string;
}

const CustomLegend: FC<any> = ({ payload, customData }) => {
  const defaultColorEntry = payload.find((entry: any) => entry.dataKey === 'count');
  const hasLowOccupancy = customData?.some((d: TimelineDataPoint) => d.isLow);

  return (
    <ul className="flex justify-center items-center gap-4 mt-2">
       {defaultColorEntry && (
         <li className="flex items-center text-sm text-slate-600">
            <span className="w-3 h-3 inline-block mr-2" style={{ backgroundColor: defaultColorEntry.color }}></span>
            {defaultColorEntry.value}
         </li>
       )}
       {hasLowOccupancy && (
        <li className="flex items-center text-sm text-slate-600">
            <span className="w-3 h-3 inline-block mr-2" style={{ backgroundColor: '#f59e0b' }}></span>
            Niedrige Auslastung
         </li>
       )}
    </ul>
  );
};


export const TimelineChart: FC<TimelineChartProps> = ({ data, color = "#00BCD4", title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-100 rounded-lg">
        <p className="text-slate-500">Keine Daten zur Visualisierung vorhanden.</p>
        <p className="text-sm text-slate-400 mt-1">Bitte erfassen oder importieren Sie zuerst Daten.</p>
      </div>
    );
  }

  const lowOccupancyColor = '#f59e0b'; // amber-500
  const CHART_HEIGHT = 320;

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 text-center text-slate-700">{title}</h3>
      
      <div style={{ height: CHART_HEIGHT, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis allowDecimals={false} label={{ value: 'Anzahl Kinder', angle: -90, position: 'insideLeft' }} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}/>
            <Legend content={<CustomLegend customData={data} />} />
            <Bar dataKey="count" name="Anwesende Kinder" fill={color}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.isLow ? lowOccupancyColor : color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
