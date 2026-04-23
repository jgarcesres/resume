import { motion } from 'framer-motion';
import { serviceIconMap } from '../ui/PixelIcons';
import { useTheme } from '../../context/ThemeContext';

interface Service {
  name: string;
  category: string;
  status: string;
  icon: string;
}

interface ServiceStatusProps {
  services: Service[];
}

const rpgCategoryClass: Record<string, string> = {
  media: 'text-neon-magenta',
  monitoring: 'text-neon-gold',
  infra: 'text-neon-cyan',
  storage: 'text-neon-green',
  family: 'text-neon-magenta',
  apps: 'text-neon-cyan',
};

// Authentic server-rack LED colors — kept identical across themes.
const statusIndicator: Record<string, { color: string; label: string }> = {
  online: { color: '#3FD771', label: 'ONLINE' },
  offline: { color: '#E5484D', label: 'OFFLINE' },
  degraded: { color: '#E8B339', label: 'DEGRADED' },
};

function ServiceStatus({ services }: ServiceStatusProps) {
  const { isRpg } = useTheme();
  const categories = [...new Set(services.map((s) => s.category))];

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const catServices = services.filter((s) => s.category === cat);
        const catClass = isRpg
          ? rpgCategoryClass[cat] || 'text-neon-cyan'
          : 'text-pro-ink-soft';

        return (
          <div key={cat}>
            {isRpg ? (
              <h3 className={`font-pixel text-[9px] uppercase mb-3 ${catClass}`}>
                {cat}
              </h3>
            ) : (
              <div className="flex items-baseline gap-3 mb-3">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-pro-ink-soft">
                  {cat}
                </h3>
                <span className="flex-1 h-px bg-pro-rule" aria-hidden />
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {catServices.map((service, i) => {
                const st = statusIndicator[service.status] || statusIndicator.offline;
                const IconComponent = serviceIconMap[service.icon];
                if (!IconComponent && import.meta.env.DEV) {
                  console.warn(
                    `[ServiceStatus] No icon in serviceIconMap for "${service.icon}" (service: ${service.name}). Available: ${Object.keys(serviceIconMap).join(', ')}`
                  );
                }
                return (
                  <motion.div
                    key={service.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className={
                      isRpg
                        ? 'border border-rpg-border/50 bg-rpg-panel/50 p-2.5 flex items-center gap-2 group hover:border-rpg-border-light transition-colors'
                        : 'border border-pro-rule bg-pro-surface p-2.5 flex items-center gap-2 group hover:border-pro-rule-strong transition-colors'
                    }
                  >
                    <span className={`shrink-0 w-4 h-4 ${isRpg ? 'text-rpg-text' : 'text-pro-ink-soft'}`}>
                      {IconComponent ? <IconComponent className="w-4 h-4" /> : service.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span
                        className={
                          isRpg
                            ? 'font-body text-[11px] text-rpg-text block truncate'
                            : 'font-sans text-[12px] text-pro-ink block truncate'
                        }
                      >
                        {service.name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: st.color,
                            boxShadow: `0 0 6px ${st.color}`,
                          }}
                        />
                        <span
                          className={isRpg ? 'font-pixel text-[6px]' : 'font-mono text-[9px] tracking-[0.16em]'}
                          style={{ color: st.color }}
                        >
                          {st.label}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ServiceStatus;
