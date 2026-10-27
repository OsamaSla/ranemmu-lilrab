Attribute VB_Name = "Module2"
Option Explicit
Sub test1()
Dim Filled As Long
Dim Err As Integer
Dim i As Integer
Dim t As Integer
Dim SAM As Integer
Dim A1 As Long
Dim VARR As Integer
Dim SAT As Integer
Dim YAY As Integer
Dim daysInMonth As Integer
Dim ddat As Date
Dim HRS()

SAM = 2
YAY = 0 ' קביעת שנה אחרי חודש דצמבר לרשום 1- בהתחלת שנה חדשה
Application.ScreenUpdating = False
    With Application
        .Calculation = xlCalculationAutomatic
        .ScreenUpdating = True
        .DisplayStatusBar = True
        .EnableEvents = True
    End With
    
    With Application
        .Calculation = xlCalculationManual
        .ScreenUpdating = False
        .DisplayStatusBar = False
        .EnableEvents = False
    End With
Worksheets(1).Activate
ddat = DateSerial(Year(Date) + YAY, Month(Range("c2")) + 1, 0)
daysInMonth = Day(ddat)
Filled = Range("B2", Range("B2").End(xlDown)).Rows.Count
A1 = Filled / daysInMonth
    If (Filled / daysInMonth) <> Round(Filled / daysInMonth) Then
        MsgBox ("please check missing days")
        Exit Sub
    End If

ReDim HRS(Filled, 5)
    For i = 1 To Filled
        VARR = Range("A" & i + 1)
        Range("A" & i + 1) = VARR
    Next i

Range("A1").CurrentRegion.Sort key1:=Range("a1"), order1:=xlAscending, Header:=xlNo
    
    Range("A1:E" & Filled + 1).Select
    ActiveWorkbook.Worksheets(1).Sort.SortFields.Clear
    ActiveWorkbook.Worksheets(1).Sort.SortFields.Add2 Key:=Range("A2"), _
        SortOn:=xlSortOnValues, Order:=xlAscending, DataOption:= _
        xlSortTextAsNumbers
    With ActiveWorkbook.Worksheets(1).Sort
        .SetRange Range("A2:E" & Filled + 1)
        .Header = xlNo
        .MatchCase = False
        .Orientation = xlTopToBottom
        .SortMethod = xlPinYin
        .Apply
    End With
'    Rows("1:1").Select
'    Selection.Delete Shift:=xlUp
    Cells.Select
    Cells.EntireColumn.AutoFit
For i = 1 To Filled
        If Range("D" & i) <> "" And Range("E" & i) = "" Then
        Err = Err + 1
        Range("D" & i & ",E" & i).Interior.Color = 65535
        End If
        If Range("D" & i) = "" And Range("E" & i) <> "" Then
        Err = Err + 1
        Range("D" & i & ",E" & i).Interior.Color = 65535
        End If
        'איסוף נתונים
    HRS(i, 1) = Range("A" & i) 'מספר עובד
    HRS(i, 2) = Range("B" & i) 'שם עובד
    HRS(i, 3) = Mid(Range("C" & i), 1, 2) & "/" & Right(Range("C" & i), 2) 'תאריך
    HRS(i, 3) = DateAdd("yyyy", YAY, HRS(i, 3))
    HRS(i, 4) = Range("D" & i) 'שעת כניסה
    HRS(i, 5) = Range("E" & i) 'שעת יציאה
Next i
    If Err > 0 Then
    MsgBox ("missing" & Err & "cells")
    Exit Sub
    End If
    
Sheets.Add(After:=Sheets(Sheets.Count)).Name = HRS(daysInMonth, 2) & " ." & HRS(daysInMonth, 1)
ActiveSheet.DisplayRightToLeft = True
Range("G2") = HRS(1, 3)
Range("G2").NumberFormat = "mmmm / yyyy"
Range("G2:G" & daysInMonth + 2).Select
    With Selection
        .MergeCells = True
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .Orientation = -90
        .Font.Name = "DAVID"
        .Font.Bold = True
    End With
Range("A1") = "שם עובד"         'שם עובד
Range("B1").Select
    With Selection
            .ReadingOrder = xlRTL
            .Font.Bold = True
    End With

Range(Cells(1, 2), Cells(1, 7)).Select
    With Selection
        .MergeCells = True
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With
                                    'כיתוב בתוך תאים
Cells(2, 1) = "תאריך"
Cells(2, 2) = "יום"
Cells(2, 3) = "שעת כניסה"
Cells(2, 4) = "שעת יציאה"
Cells(2, 5) = "שעות עבודה"
Cells(2, 6) = "ש.ע. עשרוני"
Cells(daysInMonth + 4, 5) = "סה''כ שעות"
Cells(daysInMonth + 6, 5) = "ימי נוכחות"
Cells(daysInMonth + 7, 5) = "ימי העדרות"

Range("A1:F" & daysInMonth + 7).Select
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .Font.Name = "DAVID"
        .Font.Size = 14
    End With
    
Range("B1,G2").Font.Size = 26
SAT = 0
                                        'פורמטים לתאי תאריך ושעה
Range(Cells(3, 3), Cells(daysInMonth + 2, 5)).Select
Selection.NumberFormat = "[$-,100]hh:mm;@"
Range(Cells(3, 6), Cells(daysInMonth + 4, 6)).Select
Selection.NumberFormat = "00.00"
Range(Cells(3, 1), Cells(daysInMonth + 2, 1)).Select
Selection.NumberFormat = "dd/mm"
Range(Cells(3, 2), Cells(daysInMonth + 2, 2)).Select
Selection.NumberFormat = "dddd"
For i = 1 To daysInMonth
    Range("A" & i + 2) = HRS(i, 3)
    Range("B" & i + 2) = HRS(i, 3)
        If Weekday(Range("A" & i + 2)) = 7 Then
        SAT = SAT + 1
        Range("B" & i + 2, Range("F" & i + 2)).Select
            With Selection
                .Merge
                .Interior.Color = 65535
            End With
        GoTo line2
        End If
    Range("E" & i + 2).FormulaR1C1 = "=(RC[-1])-(RC[-2])"
        If Weekday(Range("A" & i + 2)) = 6 Then
        Range("F" & i + 2).FormulaR1C1 = "=HOUR(RC[-1])-1.5+MINUTE(RC[-1])/60"
            Else
            Range("F" & i + 2).FormulaR1C1 = "=HOUR(RC[-1])-1+MINUTE(RC[-1])/60"
        End If
    
line2:
Next i
Cells(daysInMonth + 4, 6).Formula = "=SUM(" & Range(Cells(3, 6), Cells(daysInMonth + 2, 6)).Address(False, False) & ")"
Cells(daysInMonth + 6, 6).Formula = "=count(" & Range(Cells(3, 6), Cells(daysInMonth + 2, 6)).Address(False, False) & ")"
Cells(daysInMonth + 7, 6).FormulaR1C1 = "=" & daysInMonth & "-R[-1]C" & "-" & SAT
                    'Borders
Range("A1:F" & daysInMonth + 2 & ",G2").Select
ThickBor
Range("A1,B1,A2,A3:A" & daysInMonth + 2 & ",B2:F2,E" & daysInMonth + 4 & ",F" & daysInMonth + 4 & ",E" & daysInMonth + 6 & ":F" & daysInMonth + 7).Select
    With Selection
        ThickBor
        .Font.Bold = True
    End With
    
Range("E" & daysInMonth + 4 & ",F" & daysInMonth + 4 & ",E" & daysInMonth + 6 & ":F" & daysInMonth + 7).Select
    With Selection.Font
        .Size = 18
        .ThemeColor = xlThemeColorAccent1
        .TintAndShade = 0
    End With
    
VARR = 0
For i = 2 To A1
    Sheets(SAM).Copy After:=Sheets(i + (SAM - 2))
    Sheets(i + (SAM - 1)).Name = HRS(daysInMonth * i, 2) & " ." & HRS(daysInMonth * i, 1)
    Range("B1") = HRS(daysInMonth * i, 2)
    For t = 1 To daysInMonth
        VARR = VARR + 1
            If Weekday(Range("A" & t + 2)) <> 7 Then
                If HRS(daysInMonth + VARR, 4) = "" Then
                Range("E" & t + 2, "F" & t + 2).Clear
                Range("C" & t + 2, "F" & t + 2).Select
                    With Selection
                        .Merge
                        .Interior.Pattern = xlSolid
                        .Interior.PatternColorIndex = xlAutomatic
                        .Interior.ThemeColor = xlThemeColorAccent1
                        .Interior.TintAndShade = 0.799981688894314
                        .Interior.PatternTintAndShade = 0
                    End With
                Else
                    Range("C" & t + 2) = HRS(daysInMonth + VARR, 4)
                    Range("D" & t + 2) = HRS(daysInMonth + VARR, 5)
                End If
            End If
    Next t
        Cells.Select
        Cells.EntireColumn.AutoFit
    Range("c" & daysInMonth + 2).Select
        With Selection.Borders(xlEdgeBottom)
            .LineStyle = xlContinuous
            .ColorIndex = 0
            .TintAndShade = 0
            .Weight = xlMedium
        End With
    Range("A1").Select
Next i
Sheets(SAM).Activate
Range("B1") = HRS(1, 2)
For t = 1 To daysInMonth
    If Weekday(Range("A" & t + 2)) <> 7 Then
        If HRS(t, 4) = "" Then
            Range("E" & t + 2, "F" & t + 2).Clear
            Range("C" & t + 2, "F" & t + 2).Select
                With Selection
                    .Merge
                    .Interior.Pattern = xlSolid
                    .Interior.PatternColorIndex = xlAutomatic
                    .Interior.ThemeColor = xlThemeColorAccent1
                    .Interior.TintAndShade = 0.799981688894314
                    .Interior.PatternTintAndShade = 0
                End With
            Else
            Range("C" & t + 2) = HRS(t, 4)
            Range("D" & t + 2) = HRS(t, 5)
        End If
    End If
Next t
Range("c" & daysInMonth + 2).Select
    With Selection.Borders(xlEdgeBottom)
        .LineStyle = xlContinuous
        .ColorIndex = 0
        .TintAndShade = 0
        .Weight = xlMedium
    End With
    Cells.Select
    Cells.EntireColumn.AutoFit
    Range("A1").Select

With Application
    .Calculation = xlCalculationAutomatic
    .ScreenUpdating = True
    .DisplayStatusBar = True
    .EnableEvents = True
End With

Sheets.Add(After:=Sheets(Sheets.Count)).Name = "סיכום"
ActiveSheet.DisplayRightToLeft = True
Range("A1", "D1").Select
    With Selection
        .Merge
        .NumberFormat = ("mmmm/yyyy")
    End With
Range("A1:D" & A1 + 2).Select
    With Selection
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .Font.Name = "DAVID"
        .Font.Size = 22
    End With
Range("A1").Select
    With Selection.Font
        .Bold = True
        .Size = 36
    End With
Range("a2:d2").Font.Bold = True
Range("A1") = HRS(1, 3)
Range("A2") = "מס'"
Range("B2") = "שם עובד"
Range("C2") = "ימי נוכחות"
Range("D2") = "שעות עבודה"
    For i = 1 To A1
    Range("A" & i + 2) = HRS(i * daysInMonth, 1)
    Range("B" & i + 2) = HRS(i * daysInMonth, 2)
    Range("C" & i + 2) = Sheets(SAM - 1 + i).Range("F" & daysInMonth + 6)
    Range("D" & i + 2) = Sheets(SAM - 1 + i).Range("F" & daysInMonth + 4)
    Range("D" & i + 2).NumberFormat = "0.00"
    Next i
Range("A1:D" & A1 + 2 & ",A1,A2:D2").Select
ThickBor
    Cells.Select
    Cells.EntireColumn.AutoFit
Range("A1").Select
Application.ScreenUpdating = True
End Sub
