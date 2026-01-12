BEGIN
	IF OBJECT_ID('tempdb..#TempMishapResults') IS NOT NULL
	BEGIN
		DROP TABLE #TempMishapResults
	END

	;WITH CategoryHierarchy AS
	(
		-- Root Aviation & Ground Categories
		SELECT MC.MishapCategoryID, MC.MishapCategoryID AS RootCategoryId, MC.ShortDescription
		FROM ASOHEIMS.Codebook.LtbMishapCategory MC
		WHERE MC.MishapCategoryID IN (2, 3)

		UNION ALL

		-- Children of 'Ground' & 'Aviation'
		SELECT C.MishapCategoryID, CH.RootCategoryId, C.ShortDescription
		FROM ASOHEIMS.Codebook.LtbMishapCategory C
		INNER JOIN CategoryHierarchy CH ON C.MishapCategoryParentID = CH.MishapCategoryID
	)
	SELECT MishapID, CaseNumber, LocalDateOccurred, LocalTimeOccurred, MS.ShortDescription AS [Source], 
			ISNULL(MC.MishapClassificationCode, 'Unknown') AS MishapClassification,
			CASE C.RootCategoryId WHEN 2 THEN 'Aviation' ELSE 'Ground' END AS MishapType,
			UH.UnitIdentificationCode AS ResponsibleUIC,
			CF.ShortDescription AS PrimaryCauseFactor
	INTO #TempMishapResults
	FROM MNMR.AtbMishap M
	INNER JOIN ASOHEIMS.Codebook.LtbMishapSource MS ON M.MishapSourceID = MS.MishapSourceID
	INNER JOIN CategoryHierarchy C ON M.MishapCategoryGroupID = C.MishapCategoryID
	LEFT JOIN ASOHEIMS.Codebook.LtbMishapClassification MC ON M.MishapClassificationID = MC.MishapClassificationID
	LEFT JOIN MNMR.AtbUICHierarchy UH ON M.ResponsibleUICID = UH.UICID
	LEFT JOIN ASOHEIMS.Codebook.LtbCauseFactor CF ON M.PrimaryCauseFactorID = CF.CauseFactorID
	WHERE M.IsDeleted = 0 AND CaseNumber IS NOT NULL AND LocalDateOccurred IS NOT NULL

	--SELECT * FROM #TempMishapResults

	SELECT 
		YEAR(LocalDateOccurred) AS year,
		DATEPART(QUARTER, LocalDateOccurred) AS quarter,
		'MishapType' AS entity_type,
		ISNULL(MishapType, 'Unknown') AS entity_value,
		COUNT(1) AS mishap_count
	FROM #TempMishapResults
	GROUP BY
		YEAR(LocalDateOccurred),
		DATEPART(QUARTER, LocalDateOccurred),
		ISNULL(MishapType, 'Unknown')

	UNION ALL

	SELECT 
		YEAR(LocalDateOccurred) AS year,
		DATEPART(QUARTER, LocalDateOccurred) AS quarter,
		'Source' AS entity_type,
		ISNULL(Source, 'Unknown') COLLATE DATABASE_DEFAULT AS entity_value,
		COUNT(1) AS mishap_count
	FROM #TempMishapResults
	GROUP BY
		YEAR(LocalDateOccurred),
		DATEPART(QUARTER, LocalDateOccurred),
		ISNULL(Source, 'Unknown') COLLATE DATABASE_DEFAULT 

	UNION ALL

	SELECT 
		YEAR(LocalDateOccurred) AS year,
		DATEPART(QUARTER, LocalDateOccurred) AS quarter,
		'MishapClassification' AS entity_type,
		ISNULL(MishapClassification, 'Unknown') COLLATE DATABASE_DEFAULT AS entity_value,
		COUNT(1) AS mishap_count
	FROM #TempMishapResults
	GROUP BY
		YEAR(LocalDateOccurred),
		DATEPART(QUARTER, LocalDateOccurred),
		ISNULL(MishapClassification, 'Unknown') COLLATE DATABASE_DEFAULT 
END