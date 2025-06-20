import Panel from './Panel';

export default function PanelAlarms(props) {
    return (
        <Panel title="Alarms" defaultOpen={props.defaultOpen}>
            <div className="panel-content">
                <p>....</p>
            </div>
        </Panel>
    );
}