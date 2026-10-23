// IconComponent.tsx
import { scaledSize } from '@/src/utils';
import Colors from '@/src/const/ConstColors';
import React from 'react';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Entypo from 'react-native-vector-icons/Entypo';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import Fontisto from 'react-native-vector-icons/Fontisto';
import Foundation from 'react-native-vector-icons/Foundation';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Octicons from 'react-native-vector-icons/Octicons';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import Zocial from 'react-native-vector-icons/Zocial';
import { ColorValue, StyleProp, TextStyle } from 'react-native';


export type IconType =
	| 'antdesign'
	| 'entypo'
	| 'evilicons'
	| 'feather'
	| 'fontawesome'
	| 'fontawesome5'
	| 'fontawesome6'
	| 'fontisto'
	| 'foundation'
	| 'ionicons'
	| 'materialcommunityicons'
	| 'materialicons'
	| 'octicons'
	| 'simplelineicons'
	| 'zocial';

interface IconProps {
	type: string;
	name: string;
	size?: number;
	color?: ColorValue;
	style?: StyleProp<TextStyle>;
}
/**
 * react-native-vector-icons 를 활용할 수 있는 컴포넌트
 * 아이콘 링크 : https://oblador.github.io/react-native-vector-icons/
 * 
 *  호출 예시 
 const MyComponent = () => {
  return (
	<IconComponent
	  type="materialIcons"
	  name="home"
	  size={24}
	  color="#000000"
	/>
  );
};
 * @param param0 
 * @returns 
 */
// 호출부가 이미 scaledSize(...)로 넘기므로 여기서 또 스케일하면 이중 적용된다(기본값만 스케일)
const IconComponent: React.FC<IconProps> = ({ type, name, size = scaledSize(24), color = Colors.text, style }) => {
	const normalizedType = type.toLowerCase(); // 소문자 변환

	const iconMap: Record<IconType, any> = {
		antdesign: AntDesign,
		entypo: Entypo,
		evilicons: EvilIcons,
		feather: Feather,
		fontawesome: FontAwesome,
		fontawesome5: FontAwesome5,
		fontawesome6: FontAwesome6,
		fontisto: Fontisto,
		foundation: Foundation,
		ionicons: Ionicons,
		materialcommunityicons: MaterialCommunityIcons,
		materialicons: MaterialIcons,
		octicons: Octicons,
		simplelineicons: SimpleLineIcons,
		zocial: Zocial,
	};

	const Icon = iconMap[normalizedType as IconType];

	if (!Icon) {
		console.warn(`[IconComponent] '${type}'는 지원되지 않는 아이콘 타입입니다.`);
		return null;
	}

	// 아이콘 글리프는 Text 로 그려져 시스템 글꼴 배율을 따라 커진다 → 옆 텍스트·고정 박스와 높이가 어긋나므로 배율을 끈다
	return <Icon name={name} size={size} color={color} style={style} allowFontScaling={false} />;
};

export default IconComponent;
