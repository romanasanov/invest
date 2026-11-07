import type { Metadata } from 'next';
import ModelExplorer from '../../components/ModelExplorer';
import './model.css';
export const metadata: Metadata={title:'Экономика точки — Киомей',description:'Посмотрите потенциал четырёх форматов Киомей: продажи, расходы, точка безубыточности и варианты участия.'};
export default function ModelPage(){return <ModelExplorer/>;}
