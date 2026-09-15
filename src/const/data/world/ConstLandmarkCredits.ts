
/**
 * 랜드마크 사진의 출처 — 앱 안 고지에 그대로 세운다.
 * -------------------------------------------------
 * 사진 96장은 위키미디어에서 받아 온다(ConstFigureImages 의 selectLandmarkImage).
 * 위인 초상과 달리 **퍼블릭 도메인만으로는 한 판이 안 나와서** CC BY·CC BY-SA 사진을 함께 쓴다.
 * 그 라이선스들은 저작자 표시가 조건이므로 이 표가 곧 그 조건을 지키는 자리다.
 *
 * 값은 위키미디어 공용의 파일 정보(extmetadata)에서 그대로 받아 적었다.
 * 사진을 바꾸면 여기도 같이 고쳐야 한다 — 어긋나면 고지가 거짓이 된다
 * (ConstWorldData.test.ts 가 landmark.json 과 이 표가 같은지 본다).
 *
 * 원본 파일 문서 주소: https://commons.wikimedia.org/wiki/File:<file>
 */
export interface LandmarkCredit {
	/** 랜드마크 이름 — landmark.json 의 name */
	name: string;
	/** 위키미디어 파일 이름 — landmark.json 의 fields.image */
	file: string;
	/** 라이선스 이름 (공용 표기 그대로) */
	license: string;
	/** 저작자 */
	artist: string;
}

/** 사진 출처 표 — landmark.json 과 순서·개수가 같다 */
export const LANDMARK_CREDITS: LandmarkCredit[] = [
	{ name: "에펠탑", file: "Tour_Eiffel_Wikimedia_Commons_(cropped).jpg", license: "Public domain", artist: "Benh LIEU SONG" },
	{ name: "개선문", file: "Arc_Triomphe.jpg", license: "CC BY-SA 3.0", artist: "Benh LIEU SONG" },
	{ name: "루브르 박물관", file: "Paris_-_Orthophotographie_-_2018_-_Palais_du_Louvre_02.jpg", license: "Licence Ouverte", artist: "Institut national de l'information géographique et forestière" },
	{ name: "몽생미셸", file: "Mont_St_Michel_3,_Brittany,_France_-_July_2011.jpg", license: "Public domain", artist: "Diliff" },
	{ name: "빅벤", file: "Clock_Tower_-_Palace_of_Westminster,_London_-_September_2006-2.jpg", license: "CC BY 3.0", artist: "Diliff" },
	{ name: "타워브리지", file: "London,_UK_-_panoramio_(536).jpg", license: "CC BY 3.0", artist: "Tabraiz Feham" },
	{ name: "스톤헨지", file: "Stonehenge_from_the_Distance.jpg", license: "CC BY-SA 3.0", artist: "ExtraMilePhotoUK" },
	{ name: "버킹엄 궁전", file: "Buckingham_Palace_aerial_view_2016_(cropped).jpg", license: "OGL v1.0", artist: "SAC Matthew 'Gerry' Gerrard RAF/© MoD Crown Copyright 2016" },
	{ name: "콜로세움", file: "Colosseo_2020.jpg", license: "CC BY-SA 4.0", artist: "FeaturedPics" },
	{ name: "피사의 사탑", file: "Italy_-_Pisa_-_Leaning_Tower.jpg", license: "CC BY-SA 3.0 de", artist: "Arne Müseler" },
	{ name: "트레비 분수", file: "Trevi_Fountain_-_Roma.jpg", license: "CC BY-SA 4.0", artist: "NikonZ7II" },
	{ name: "산마르코 광장", file: "Venice_-_Piazza_San_Marco.jpg", license: "CC BY-SA 3.0", artist: "Ingo Mehling" },
	{ name: "밀라노 대성당", file: "Milan_Cathedral_from_Piazza_del_Duomo.jpg", license: "CC BY-SA 3.0", artist: "Jiuguang Wang" },
	{ name: "폼페이 유적", file: "Theathres_of_Pompeii.jpg", license: "CC BY-SA 4.0", artist: "ElfQrin" },
	{ name: "사그라다 파밀리아", file: "SF_maig_2_cropped.jpg", license: "CC BY-SA 4.0", artist: "Canaan" },
	{ name: "알람브라 궁전", file: "Vista_de_la_Alhambra.jpg", license: "CC BY 2.0", artist: "bernjan" },
	{ name: "구엘 공원", file: "Park_Güell_02.jpg", license: "CC BY-SA 3.0", artist: "Bernard Gagnon" },
	{ name: "프라도 미술관", file: "Museo_del_Prado_2016_(25185969599).jpg", license: "CC BY-SA 2.0", artist: "Emilio J. Rodríguez Posada" },
	{ name: "벨렝탑", file: "Lisboa_Lisbon_Lissabon.jpg", license: "CC BY 2.0", artist: "Bert K." },
	{ name: "브란덴부르크 문", file: "Berlin_Brandenburger_Tor_Abend.jpg", license: "CC BY-SA 3.0", artist: "Pedelecs (talk · contribs)" },
	{ name: "노이슈반슈타인성", file: "Castle_Neuschwanstein.jpg", license: "CC BY-SA 3.0", artist: "Softeis" },
	{ name: "쾰른 대성당", file: "Kölner_Dom_nachts_2013.jpg", license: "CC BY-SA 3.0 de", artist: "Thomas Wolf, www.foto-tw.de" },
	{ name: "쇤브룬 궁전", file: "아름다운_쉔부른.jpg", license: "CC BY-SA 3.0", artist: "Hyunah Kim" },
	{ name: "프라하성", file: "Czech-2013-Prague-Prague_Castle_at_dusk.jpg", license: "CC BY-SA 4.0", artist: "Godot13" },
	{ name: "카를교", file: "Prague_07-2016_View_from_Petrinska_Tower_img2.jpg", license: "FAL", artist: "A.Savin" },
	{ name: "파르테논 신전", file: "The_Parthenon_in_Athens.jpg", license: "CC BY 2.0", artist: "Steve Swayne" },
	{ name: "산토리니", file: "Panoramic_view_of_Oia,_Santorini_island_(Thira),_Greece.jpg", license: "CC BY-SA 3.0", artist: "Mstyslav Chernov" },
	{ name: "성 바실리 대성당", file: "Moscow_July_2011-4a.jpg", license: "CC BY-SA 3.0", artist: "Alvesgaspar" },
	{ name: "에르미타주 박물관", file: "Spb_06-2012_Palace_Embankment_various_14.jpg", license: "CC BY-SA 3.0", artist: "A.Savin" },
	{ name: "아야 소피아", file: "Hagia_Sophia_Mars_2013.jpg", license: "CC BY-SA 3.0", artist: "Arild Vågen" },
	{ name: "카파도키아", file: "Cappadocia_balloon_trip,_Ortahisar_Castle_(11893715185).jpg", license: "CC BY 2.0", artist: "Arian Zwegers from Brussels, Belgium" },
	{ name: "마테호른", file: "Matterhorn-EastAndNorthside-viewedFromZermatt_landscapeformat-2.jpg", license: "CC BY-SA 3.0", artist: "Original file: Marcel Wiesweg derivative work: Zacharie Grossen" },
	{ name: "융프라우", file: "Jungfrau03.jpg", license: "Public domain", artist: "4000er" },
	{ name: "성 베드로 대성당", file: "Basilica_di_San_Pietro_in_Vaticano_September_2015-1a.jpg", license: "CC BY-SA 4.0", artist: "Alvesgaspar" },
	{ name: "시스티나 성당", file: "God2-Sistine_Chapel.png", license: "Public domain", artist: "Michelangelo" },
	{ name: "인어공주 동상", file: "Petite_sirène_de_Copenhague_(conforme_à_la_loi_danoise).JPG", license: "CC0", artist: "Benoît Prieur" },
	{ name: "게이랑에르 피오르", file: "Geirangerfjord_.jpg", license: "CC BY-SA 2.5", artist: "Andreas Trepte" },
	{ name: "블루라군", file: "Blue-Lagoon-Iceland-January2012.jpg", license: "CC BY 4.0", artist: "Acediscovery" },
	{ name: "두브로브니크 성벽", file: "Dubrovnik,_Croatia_From_Fort_Lovrijenac.JPG", license: "CC BY-SA 4.0", artist: "Akampfer" },
	{ name: "아우슈비츠 수용소", file: "Birkenau_múzeum_-_panoramio_(cropped).jpg", license: "CC BY 3.0", artist: "pzk net" },
	{ name: "만리장성", file: "The_Great_wall_-_by_Hao_Wei.jpg", license: "CC BY 2.0", artist: "Hao Wei from China" },
	{ name: "자금성", file: "Hall_of_Supreme_Harmony_(20241127120000).jpg", license: "CC BY-SA 4.0", artist: "N509FZ" },
	{ name: "병마용갱", file: "Xian_museum.jpg", license: "Public domain", artist: "user:Robin Chen" },
	{ name: "포탈라궁", file: "Potala.jpg", license: "CC BY 2.5", artist: "Ondřej Žváček" },
	{ name: "타지마할", file: "Taj_Mahal_in_March_2004.jpg", license: "CC BY-SA 3.0", artist: "Dhirad, picture edited by J. A. Knudsen" },
	{ name: "앙코르 와트", file: "Ankor_Wat_temple.jpg", license: "CC BY-SA 4.0", artist: "Kheng Vungvuthy" },
	{ name: "보로부두르", file: "Borobudur-Nothwest-view.jpg", license: "CC BY-SA 3.0", artist: "Gunawan Kartapranata" },
	{ name: "페트로나스 트윈타워", file: "Petronas_Panorama_II.jpg", license: "CC BY-SA 4.0", artist: "Someformofhuman" },
	{ name: "마리나 베이 샌즈", file: "Marina_Bay_Sands_in_the_evening_-_20101120.jpg", license: "CC BY-SA 3.0", artist: "Someformofhuman" },
	{ name: "왓 프라깨우", file: "Temple_of_the_Emerald_of_buddha_or_Wat_Phra_Kaew_(cropped).jpg", license: "CC BY-SA 4.0", artist: "Preecha.MJ" },
	{ name: "할롱베이", file: "Halong_ensemble_(colour_corrected).jpg", license: "Public domain", artist: "Thierry Boriecolour adjusted by Lycaon" },
	{ name: "후지산", file: "080103_hakkai_fuji.jpg", license: "CC BY-SA 3.0", artist: "名古屋太郎" },
	{ name: "금각사", file: "Kinkaku-ji_the_Golden_Temple_in_Kyoto_overlooking_the_lake_-_high_rez.JPG", license: "CC BY-SA 3.0", artist: "Jaycangel" },
	{ name: "도쿄 스카이트리", file: "Tokyo_Skytree_2014_Ⅲ.jpg", license: "CC BY-SA 3.0", artist: "Kakidai" },
	{ name: "경복궁", file: "광화문_월대.jpg", license: "KOGL Type 1", artist: "서울관광 아카이브" },
	{ name: "불국사", file: "Lotus_Flower_Bridge_and_Seven_Treasure_Bridge_at_Bulguksa_in_Gyeongju,_Korea.jpg", license: "Public domain", artist: "미상" },
	{ name: "남산서울타워", file: "Seoul_Tower_(4394893276).jpg", license: "CC BY 2.0", artist: "Christopher from Shanghai, China" },
	{ name: "부르즈 할리파", file: "Burj_Khalifa_(worlds_tallest_building)_and_the_Dubai_skyline_(25781049892).jpg", license: "CC BY 2.0", artist: "imran shahabuddin" },
	{ name: "페트라", file: "Petra_Jordan_BW_22.JPG", license: "CC BY-SA 3.0", artist: "Berthold Werner" },
	{ name: "페르세폴리스", file: "Persépolis,_Irán,_2016-09-24,_DD_56.jpg", license: "CC BY-SA 4.0", artist: "Diego Delso" },
	{ name: "타이베이 101", file: "Taipei_101_2009_amk.jpg", license: "CC BY-SA 3.0", artist: "AngMoKio" },
	{ name: "에베레스트", file: "Mount_Everest_as_seen_from_Drukair2_PLW_edit_Cropped.jpg", license: "CC BY-SA 2.0", artist: "Mount_Everest_as_seen_from_Drukair2.jpg: shrimpo1967 derivative work: Papa Lima Whiskey 2 (talk)" },
	{ name: "기자의 피라미드", file: "All_Gizah_Pyramids.jpg", license: "CC BY-SA 2.0", artist: "Ricardo Liberato" },
	{ name: "스핑크스", file: "GizaSphinx.JPG", license: "CC BY 3.0", artist: "pastaitaken" },
	{ name: "아부심벨 신전", file: "Abu_Simbel_Temple_May_30_2007.jpg", license: "Public domain", artist: "Than217 at English Wikipedia" },
	{ name: "룩소르 신전", file: "Pylons_and_obelisk_Luxor_temple.JPG", license: "CC BY-SA 3.0", artist: "Ad Meskens" },
	{ name: "킬리만자로", file: "Mount_Kilimanjaro.jpg", license: "GFDL 1.2", artist: "Muhammad Mahdi Karim" },
	{ name: "세렝게티 국립공원", file: "Zebras,_Serengeti_savana_plains,_Tanzania.jpg", license: "CC BY 2.0", artist: "Gary" },
	{ name: "마사이마라", file: "Maasai-Mara-Typical-Scenery.JPG", license: "CC BY-SA 3.0", artist: "Bjørn Christian Tørrissen" },
	{ name: "카르타고 유적", file: "Ruines_de_Carthage.jpg", license: "Copyrighted free use", artist: "Patrick Verdier, Free On Line Photos" },
	{ name: "제마엘프나 광장", file: "Jemaa_el-Fnaa_at_night.jpg", license: "CC BY 2.0", artist: "procsilas" },
	{ name: "테이블마운틴", file: "Table_Mountain_DanieVDM.jpg", license: "CC BY 2.0", artist: "Danie van der Merwe from Cape Town, South Africa" },
	{ name: "희망봉", file: "Cape_of_Good_Hope.jpg", license: "Public domain", artist: "미상" },
	{ name: "그레이트 짐바브웨", file: "Great-Zimbabwe-2.jpg", license: "Public domain", artist: "Image taken by Jan Derk in 1997 in Zimbabwe." },
	{ name: "자유의 여신상", file: "Lady_Liberty_under_a_blue_sky_(cropped).jpg", license: "CC BY-SA 4.0", artist: "User:Mcj1800" },
	{ name: "그랜드캐니언", file: "Sun_rays_at_Hopi_Point_Grand_Canyon_2013.jpg", license: "CC BY-SA 3.0", artist: "Tuxyso" },
	{ name: "금문교", file: "Golden_Gate_Bridge_Emerging_from_Fog,_San_Francisco.jpg", license: "CC BY 4.0", artist: "Dongmin03" },
	{ name: "백악관", file: "White_House_north_and_south_sides.jpg", license: "CC BY-SA 4.0", artist: "(top)Cezary p(bottom)MattWade" },
	{ name: "러시모어산", file: "Dean_Franklin_-_06.04.03_Mount_Rushmore_Monument_(by-sa).jpg", license: "Public domain", artist: "Dean Franklin" },
	{ name: "옐로스톤 국립공원", file: "YellowstonefallJUN05.JPG", license: "CC BY 2.5", artist: "Scott Catron" },
	{ name: "CN 타워", file: "Toronto_-_ON_-_Toronto_Harbourfront7.jpg", license: "CC BY-SA 3.0", artist: "Wladyslaw" },
	{ name: "밴프 국립공원", file: "Moraine_Lake_17092005.jpg", license: "Public domain", artist: "Gorgo" },
	{ name: "치첸이트사", file: "Chichen_Itza_2.jpg", license: "CC BY-SA 4.0", artist: "Daniel Schwen" },
	{ name: "테오티우아칸", file: "Bajo_el_cielo_teotihuacano.jpg", license: "CC BY-SA 3.0", artist: "El Cristo" },
	{ name: "파나마 운하", file: "Panama_Canal,_Agua_Clara_locks,_Control_tower_(Torre_de_control).jpg", license: "CC BY-SA 4.0", artist: "Dr. Thomas Liptak" },
	{ name: "마추픽추", file: "80_-_Machu_Picchu_-_Juin_2009_-_edit.jpg", license: "CC BY-SA 3.0", artist: "Martin St-Amant (S23678)" },
	{ name: "나스카 지상화", file: "Líneas_de_Nazca,_Nazca,_Perú,_2015-07-29,_DD_55.JPG", license: "CC BY-SA 4.0", artist: "Diego Delso" },
	{ name: "구세주 그리스도상", file: "Cristo_Redentor_-_Rio.jpg", license: "Public domain", artist: "Sean Vivek Crasto" },
	{ name: "우유니 소금사막", file: "Salar_de_Uyuni_ISS012-E-6456.jpg", license: "Public domain", artist: "ISS Crew Earth Observations experiment and the Image Science &amp; Analysis Group, Johnson Space Center." },
	{ name: "모아이 석상", file: "Moai_Rano_raraku.jpg", license: "Public domain", artist: "Aurbina" },
	{ name: "갈라파고스 제도", file: "Bright_green_hills_on_Galapagos_islands.jpg", license: "Public domain", artist: "Stolz Gary M, U.S. Fish and Wildlife Service" },
	{ name: "앙헬 폭포", file: "Salto_del_Angel-Canaima-Venezuela03.JPG", license: "CC BY 3.0", artist: "Diego Delso" },
	{ name: "시드니 오페라하우스", file: "Sydney_Opera_House_from_Circular_Quay,_2023,_10.jpg", license: "CC BY-SA 4.0", artist: "Kgbo" },
	{ name: "울루루", file: "ULURU.jpg", license: "CC BY-SA 4.0", artist: "Ek2030372672" },
	{ name: "그레이트배리어리프", file: "GreatBarrierReef-EO.JPG", license: "Public domain", artist: "NASA, by MISR" },
	{ name: "밀퍼드사운드", file: "Milford_Sound_(New_Zealand).JPG", license: "CC BY-SA 3.0", artist: "Maros M r a z (Maros)" },
];

/** 저작자 표시가 필요 없는 라이선스 — 고지에서는 함께 세우되 화면 설명에 쓴다 */
export const FREE_LICENSES = ['Public domain', 'CC0'];

/** 표가 데이터와 어긋나지 않는지 확인할 때 쓰는 열쇠 */
export const creditOf = (file: string): LandmarkCredit | undefined => LANDMARK_CREDITS.find((item) => item.file === file);
