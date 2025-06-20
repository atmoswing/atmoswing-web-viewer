import Panel from './Panel';

export default function PanelStations(props) {
    return (
        <Panel title="Station selection" defaultOpen={props.defaultOpen}>
            <div className="panel-content">
                <p>....</p>
            </div>
        </Panel>
    );
}