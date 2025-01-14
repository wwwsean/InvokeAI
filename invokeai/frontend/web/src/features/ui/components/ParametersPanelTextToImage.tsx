import type { ChakraProps } from '@invoke-ai/ui-library';
import { Box, Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from '@invoke-ai/ui-library';
import { useAppSelector } from 'app/store/storeHooks';
import { overlayScrollbarsParams } from 'common/components/OverlayScrollbars/constants';
import { ControlLayersPanelContent } from 'features/controlLayers/components/ControlLayersPanelContent';
import { Prompts } from 'features/parameters/components/Prompts/Prompts';
import QueueControls from 'features/queue/components/QueueControls';
import { SDXLPrompts } from 'features/sdxl/components/SDXLPrompts/SDXLPrompts';
import { AdvancedSettingsAccordion } from 'features/settingsAccordions/components/AdvancedSettingsAccordion/AdvancedSettingsAccordion';
import { CompositingSettingsAccordion } from 'features/settingsAccordions/components/CompositingSettingsAccordion/CompositingSettingsAccordion';
import { ControlSettingsAccordion } from 'features/settingsAccordions/components/ControlSettingsAccordion/ControlSettingsAccordion';
import { GenerationSettingsAccordion } from 'features/settingsAccordions/components/GenerationSettingsAccordion/GenerationSettingsAccordion';
import { ImageSettingsAccordion } from 'features/settingsAccordions/components/ImageSettingsAccordion/ImageSettingsAccordion';
import { RefinerSettingsAccordion } from 'features/settingsAccordions/components/RefinerSettingsAccordion/RefinerSettingsAccordion';
import { activeTabNameSelector } from 'features/ui/store/uiSelectors';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import type { CSSProperties } from 'react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const overlayScrollbarsStyles: CSSProperties = {
  height: '100%',
  width: '100%',
};

const baseStyles: ChakraProps['sx'] = {
  fontWeight: 'semibold',
  fontSize: 'sm',
  color: 'base.300',
};

const selectedStyles: ChakraProps['sx'] = {
  borderColor: 'base.800',
  borderBottomColor: 'base.900',
  color: 'invokeBlue.300',
};

const ParametersPanelTextToImage = () => {
  const { t } = useTranslation();
  const activeTabName = useAppSelector(activeTabNameSelector);
  const controlLayersCount = useAppSelector((s) => s.controlLayers.present.layers.length);
  const controlLayersTitle = useMemo(() => {
    if (controlLayersCount === 0) {
      return t('controlLayers.controlLayers');
    }
    return `${t('controlLayers.controlLayers')} (${controlLayersCount})`;
  }, [controlLayersCount, t]);
  const isSDXL = useAppSelector((s) => s.generation.model?.base === 'sdxl');

  return (
    <Flex w="full" h="full" flexDir="column" gap={2}>
      <QueueControls />
      <Flex w="full" h="full" position="relative">
        <Box position="absolute" top={0} left={0} right={0} bottom={0}>
          <OverlayScrollbarsComponent defer style={overlayScrollbarsStyles} options={overlayScrollbarsParams.options}>
            <Flex gap={2} flexDirection="column" h="full" w="full">
              {isSDXL ? <SDXLPrompts /> : <Prompts />}
              <Tabs variant="enclosed" display="flex" flexDir="column" w="full" h="full" gap={2}>
                <TabList gap={2} fontSize="sm" borderColor="base.800">
                  <Tab sx={baseStyles} _selected={selectedStyles}>
                    {t('common.settingsLabel')}
                  </Tab>
                  <Tab sx={baseStyles} _selected={selectedStyles}>
                    {controlLayersTitle}
                  </Tab>
                </TabList>
                <TabPanels w="full" h="full">
                  <TabPanel p={0} w="full" h="full">
                    <Flex gap={2} flexDirection="column" h="full" w="full">
                      <ImageSettingsAccordion />
                      <GenerationSettingsAccordion />
                      {activeTabName !== 'generation' && <ControlSettingsAccordion />}
                      {activeTabName === 'canvas' && <CompositingSettingsAccordion />}
                      {isSDXL && <RefinerSettingsAccordion />}
                      <AdvancedSettingsAccordion />
                    </Flex>
                  </TabPanel>
                  <TabPanel p={0} w="full" h="full">
                    <ControlLayersPanelContent />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Flex>
          </OverlayScrollbarsComponent>
        </Box>
      </Flex>
    </Flex>
  );
};

export default memo(ParametersPanelTextToImage);
